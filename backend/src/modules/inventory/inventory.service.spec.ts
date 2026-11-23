import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    inventory: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    branch: { findUnique: jest.Mock };
    inventoryAuditLog: { findFirst: jest.Mock };
    orderItem: { findUnique: jest.Mock };
    product: { findMany: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let eventsGateway: {
    emitLowStockAlert: jest.Mock;
    emitMenuAvailabilityUpdated: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      inventory: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      branch: { findUnique: jest.fn() },
      inventoryAuditLog: { findFirst: jest.fn() },
      orderItem: { findUnique: jest.fn() },
      product: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      $transaction: jest.fn(),
    };
    eventsGateway = {
      emitLowStockAlert: jest.fn(),
      emitMenuAvailabilityUpdated: jest.fn(),
    };
    service = new InventoryService(
      prisma as unknown as PrismaService,
      eventsGateway as unknown as EventsGateway,
    );
  });

  it('should classify branch inventory into OK, LOW_STOCK, and OUT_OF_STOCK and filter properly', async () => {
    prisma.inventory.findMany.mockResolvedValue([
      {
        id: 'i1',
        branchId: 'b1',
        ingredientId: 'ing-1',
        currentStock: '50',
        minSafetyStock: '10',
        costPrice: '10000',
        supplier: 'NCC A',
        lastRestockedAt: null,
        updatedAt: new Date(),
        ingredient: { name: 'Thịt bò', baseUnit: 'kg' },
      },
      {
        id: 'i2',
        branchId: 'b1',
        ingredientId: 'ing-2',
        currentStock: '5',
        minSafetyStock: '10',
        costPrice: '5000',
        supplier: 'NCC B',
        lastRestockedAt: null,
        updatedAt: new Date(),
        ingredient: { name: 'Rau ngò', baseUnit: 'kg' },
      },
      {
        id: 'i3',
        branchId: 'b1',
        ingredientId: 'ing-3',
        currentStock: '0',
        minSafetyStock: '5',
        costPrice: '3000',
        supplier: 'NCC C',
        lastRestockedAt: null,
        updatedAt: new Date(),
        ingredient: { name: 'Đào ngâm', baseUnit: 'hộp' },
      },
    ]);

    const all = await service.getBranchInventory('b1', 'ALL');
    expect(all.map((i) => i.status)).toEqual(['OK', 'LOW_STOCK', 'OUT_OF_STOCK']);

    const low = await service.getBranchInventory('b1', 'LOW_STOCK');
    expect(low).toHaveLength(1);
    expect(low[0].ingredientId).toBe('ing-2');

    const out = await service.getBranchInventory('b1', 'OUT_OF_STOCK');
    expect(out).toHaveLength(1);
    expect(out[0].ingredientId).toBe('ing-3');
  });

  it('should skip BOM deduction if orderItem was already deducted (idempotency)', async () => {
    prisma.inventoryAuditLog.findFirst.mockResolvedValue({ id: 'log-1' });

    const res = await service.deductInventoryForOrderItem('item-1');
    expect(res).toEqual({
      skipped: true,
      reason: 'Món ăn này đã được trừ kho trước đó',
    });
    expect(prisma.orderItem.findUnique).not.toHaveBeenCalled();
  });

  it('should deduct product + modifier BOM stock with FOR UPDATE and emit low-stock alert', async () => {
    prisma.inventoryAuditLog.findFirst.mockResolvedValue(null);
    prisma.orderItem.findUnique.mockResolvedValue({
      id: 'item-1',
      quantity: 2,
      order: { orderSession: { branchId: 'branch-1', table: { branchId: 'branch-1' } } },
      product: {
        name: 'Bánh Mì Xá Xíu',
        recipes: [
          {
            ingredientId: 'ing-meat',
            amountNeeded: '0.2',
            ingredient: { name: 'Thịt Xá Xíu', baseUnit: 'kg' },
          },
        ],
      },
      modifiers: [
        {
          quantity: 1,
          itemModifier: {
            name: 'Thêm Thịt',
            recipes: [
              {
                ingredientId: 'ing-meat',
                amountNeeded: '0.1',
                ingredient: { name: 'Thịt Xá Xíu', baseUnit: 'kg' },
              },
            ],
          },
        },
      ],
    });

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'inv-1',
          branch_id: 'branch-1',
          ingredient_id: 'ing-meat',
          current_stock: '1.0',
          min_safety_stock: '0.5',
        },
      ]),
      inventory: { update: jest.fn() },
      inventoryAuditLog: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (cb: (client: typeof tx) => unknown) => cb(tx));

    const res = (await service.deductInventoryForOrderItem('item-1')) as {
      success: boolean;
      deductedDetails: Array<{ amountDeducted: number; remainingStock: number }>;
    };

    expect(res.success).toBe(true);
    // (0.2 * 2) + (0.1 * 1 * 2) = 0.6 -> remaining = 0.4 <= minSafetyStock 0.5
    expect(res.deductedDetails[0].amountDeducted).toBeCloseTo(0.6);
    expect(res.deductedDetails[0].remainingStock).toBeCloseTo(0.4);
    expect(tx.inventory.update).toHaveBeenCalledTimes(1);
    expect(tx.inventoryAuditLog.create).toHaveBeenCalledTimes(1);
    expect(eventsGateway.emitLowStockAlert).toHaveBeenCalledTimes(1);
  });

  it('should throw BadRequestException when stock is insufficient (Strict Inventory)', async () => {
    prisma.inventoryAuditLog.findFirst.mockResolvedValue(null);
    prisma.orderItem.findUnique.mockResolvedValue({
      id: 'item-2',
      quantity: 5,
      order: { orderSession: { branchId: 'branch-1', table: { branchId: 'branch-1' } } },
      product: {
        name: 'Bánh Mì Xá Xíu',
        recipes: [
          {
            ingredientId: 'ing-meat',
            amountNeeded: '1.0',
            ingredient: { name: 'Thịt Xá Xíu', baseUnit: 'kg' },
          },
        ],
      },
      modifiers: [],
    });

    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'inv-1',
          branch_id: 'branch-1',
          ingredient_id: 'ing-meat',
          current_stock: '2.0',
          min_safety_stock: '0.5',
        },
      ]),
      inventory: { update: jest.fn() },
      inventoryAuditLog: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (cb: (client: typeof tx) => unknown) => cb(tx));

    await expect(service.deductInventoryForOrderItem('item-2')).rejects.toThrow(
      BadRequestException,
    );
    expect(tx.inventory.update).not.toHaveBeenCalled();
  });

  it('should restock inventory and create negative-deduction audit log', async () => {
    prisma.branch.findUnique.mockResolvedValue({ id: 'branch-1' });
    const tx = {
      ingredient: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ing-1', name: 'Đường', baseUnit: 'kg' }),
      },
      inventory: {
        findUnique: jest.fn().mockResolvedValue({ id: 'inv-1', currentStock: '10', costPrice: '20000' }),
        update: jest.fn().mockResolvedValue({ id: 'inv-1', currentStock: '25' }),
      },
      inventoryAuditLog: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (cb: (client: typeof tx) => unknown) => cb(tx));

    const res = await service.restock({
      branchId: 'branch-1',
      items: [{ ingredientId: 'ing-1', quantity: 15 }],
      note: 'Nhập hàng sáng',
    });

    expect(res.restockedItems[0]).toMatchObject({
      ingredientId: 'ing-1',
      previousStock: 10,
      addedQuantity: 15,
      newStock: 25,
    });
    expect(tx.inventoryAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountDeducted: -15, remainingStock: 25 }),
      }),
    );
  });

  it('should throw NotFoundException on restock if branch does not exist', async () => {
    prisma.branch.findUnique.mockResolvedValue(null);
    await expect(
      service.restock({ branchId: 'bad-branch', items: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should auto-lock product as out of stock and emit socket event when ingredient reaches 0', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'menu-4',
        name: 'Salad Cá Hồi Nauy Sốt Chanh Dây',
        isAvailable: true,
        recipes: [
          {
            ingredientId: 'ing-9',
            amountNeeded: '80',
            ingredient: { name: 'Cá hồi Na Uy phi lê tươi', baseUnit: 'g' },
          },
        ],
      },
    ]);
    prisma.inventory.findMany.mockResolvedValue([
      { branchId: 'branch-1', ingredientId: 'ing-9', currentStock: '0' },
    ]);

    const updates = await service.syncProductsAvailabilityForIngredients('branch-1', ['ing-9']);

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      productId: 'menu-4',
      isAvailable: false,
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'menu-4' },
      data: { isAvailable: false },
    });
    expect(eventsGateway.emitMenuAvailabilityUpdated).toHaveBeenCalledWith({
      branchId: 'branch-1',
      updates,
    });
  });
});
