import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderItemStatus, Role, SessionStatus, TableStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    table: { findUnique: jest.Mock; findFirst: jest.Mock };
    product: { findMany: jest.Mock };
    itemModifier: { findMany: jest.Mock };
    orderItem: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let inventoryService: {
    deductInventoryForOrderItem: jest.Mock;
    deductInventoryForOrderItems: jest.Mock;
  };
  let eventsGateway: {
    emitOrderPlaced: jest.Mock;
    emitOrderItemStatusUpdated: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      table: { findUnique: jest.fn(), findFirst: jest.fn() },
      product: { findMany: jest.fn() },
      itemModifier: { findMany: jest.fn() },
      orderItem: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    inventoryService = {
      deductInventoryForOrderItem: jest.fn().mockResolvedValue({ success: true }),
      deductInventoryForOrderItems: jest.fn().mockResolvedValue({ success: true }),
    };
    eventsGateway = {
      emitOrderPlaced: jest.fn(),
      emitOrderItemStatusUpdated: jest.fn(),
    };
    service = new OrdersService(
      prisma as unknown as PrismaService,
      inventoryService as unknown as InventoryService,
      eventsGateway as unknown as EventsGateway,
    );
  });

  it('should open a new session, set table OCCUPIED, create order, and emit realtime event', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 'tbl-1',
      branchId: 'branch-1',
      tableNumber: 'T-01',
      capacity: 4,
      branch: { isActive: true },
    });
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Bánh Mì Xá Xíu',
        price: '45000',
        isAvailable: true,
        kitchenStationId: 'st-hot',
        kitchenStation: { id: 'st-hot', name: 'Bếp Nóng' },
      },
    ]);

    const tx = {
      orderSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'sess-1', status: SessionStatus.OPEN }),
      },
      table: { update: jest.fn() },
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'ord-1',
          orderCode: 'ORD-101',
          items: [{ id: 'item-1', productId: 'prod-1', quantity: 1 }],
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (cb: (client: typeof tx) => unknown) => cb(tx));

    const order = await service.placeOrder(
      { items: [{ productId: 'prod-1', quantity: 1, note: 'Ít ớt' }] },
      'tbl-1',
      { isGuest: true },
    );

    expect(order.id).toBe('ord-1');
    expect(tx.orderSession.create).toHaveBeenCalledTimes(1);
    expect(tx.table.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: TableStatus.OCCUPIED }) }),
    );
    expect(eventsGateway.emitOrderPlaced).toHaveBeenCalledTimes(1);
  });

  it('should reject ordering an unavailable product', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 'tbl-1',
      branchId: 'branch-1',
      branch: { isActive: true },
    });
    prisma.product.findMany.mockResolvedValue([
      { id: 'prod-1', name: 'Món Hết Hàng', isAvailable: false },
    ]);

    await expect(
      service.placeOrder({ items: [{ productId: 'prod-1', quantity: 1 }] }, 'tbl-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should forbid cross-branch staff from placing order', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 'tbl-2',
      branchId: 'branch-2',
      branch: { isActive: true },
    });

    await expect(
      service.placeOrder({ items: [{ productId: 'prod-1', quantity: 1 }] }, 'tbl-2', {
        isGuest: false,
        user: { id: 'u1', username: 'cashier', role: Role.CASHIER, branchId: 'branch-1' },
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should trigger BOM deduction when KDS marks item READY', async () => {
    prisma.orderItem.findUnique.mockResolvedValue({
      id: 'item-1',
      status: OrderItemStatus.COOKING,
      startedAt: new Date(),
      kitchenStationId: 'st-hot',
      order: { orderSession: { table: { id: 'tbl-1', branchId: 'branch-1' } } },
    });
    prisma.orderItem.update.mockResolvedValue({
      id: 'item-1',
      status: OrderItemStatus.READY,
      product: { id: 'prod-1', name: 'Bánh Mì Xá Xíu' },
      kitchenStation: { id: 'st-hot', name: 'Bếp Nóng', color: '#ef4444' },
    });

    const updated = await service.updateOrderItemStatus('item-1', OrderItemStatus.READY, {
      id: 'cook-1',
      username: 'cook',
      role: Role.COOK,
      branchId: 'branch-1',
    });

    expect(updated.status).toBe(OrderItemStatus.READY);
    expect(inventoryService.deductInventoryForOrderItem).toHaveBeenCalledWith('item-1');
    expect(eventsGateway.emitOrderItemStatusUpdated).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException when updating unknown order item', async () => {
    prisma.orderItem.findUnique.mockResolvedValue(null);

    await expect(
      service.updateOrderItemStatus('unknown-item', OrderItemStatus.COOKING),
    ).rejects.toThrow(NotFoundException);
  });
});
