import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BomService } from './bom.service';

describe('BomService', () => {
  let service: BomService;
  let prisma: {
    product: { findUnique: jest.Mock };
    itemModifier: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      itemModifier: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new BomService(prisma as unknown as PrismaService);
  });

  it('should return formatted product recipe', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Bánh Mì Xá Xíu',
      recipes: [
        {
          id: 'rec-1',
          ingredientId: 'ing-1',
          amountNeeded: '0.150',
          ingredient: { name: 'Thịt Xá Xíu', baseUnit: 'kg' },
        },
      ],
    });

    const result = await service.getProductRecipe('prod-1');
    expect(result).toEqual({
      productId: 'prod-1',
      productName: 'Bánh Mì Xá Xíu',
      recipes: [
        {
          id: 'rec-1',
          ingredientId: 'ing-1',
          ingredientName: 'Thịt Xá Xíu',
          amountNeeded: 0.15,
          unit: 'kg',
        },
      ],
    });
  });

  it('should throw NotFoundException when product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.getProductRecipe('missing')).rejects.toThrow(NotFoundException);
  });

  it('should replace product recipe inside a transaction', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Trà Đào' });
    const tx = {
      recipe: { deleteMany: jest.fn(), createMany: jest.fn() },
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prod-1',
          name: 'Trà Đào',
          recipes: [
            {
              id: 'rec-2',
              ingredientId: 'ing-tea',
              amountNeeded: '20',
              ingredient: { name: 'Trà Đen', baseUnit: 'g' },
            },
          ],
        }),
      },
    };
    prisma.$transaction.mockImplementation(async (cb: (client: typeof tx) => unknown) => cb(tx));

    const updated = await service.updateProductRecipe('prod-1', {
      recipes: [{ ingredientId: 'ing-tea', amountNeeded: 20 }],
    });

    expect(tx.recipe.deleteMany).toHaveBeenCalledWith({ where: { productId: 'prod-1' } });
    expect(tx.recipe.createMany).toHaveBeenCalledTimes(1);
    expect(updated.recipes).toHaveLength(1);
    expect(updated.recipes[0].amountNeeded).toBe(20);
  });

  it('should throw NotFoundException when modifier does not exist', async () => {
    prisma.itemModifier.findUnique.mockResolvedValue(null);
    await expect(service.getModifierRecipe('missing-mod')).rejects.toThrow(NotFoundException);
  });
});
