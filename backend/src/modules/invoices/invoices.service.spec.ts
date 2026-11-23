import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  OrderItemStatus,
  PaymentMethod,
  PaymentStatus,
  Role,
  SessionStatus,
  TableStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: {
    table: { findUnique: jest.Mock; findFirst: jest.Mock };
    orderSession: { findFirst: jest.Mock };
    invoice: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let eventsGateway: {
    emitTableUpdated: jest.Mock;
    server: { to: jest.Mock };
  };

  beforeEach(() => {
    const emitMock = jest.fn();
    prisma = {
      table: { findUnique: jest.fn(), findFirst: jest.fn() },
      orderSession: { findFirst: jest.fn() },
      invoice: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    eventsGateway = {
      emitTableUpdated: jest.fn(),
      server: { to: jest.fn().mockReturnValue({ emit: emitMock }) },
    };
    service = new InvoicesService(
      prisma as unknown as PrismaService,
      eventsGateway as unknown as EventsGateway,
    );
  });

  it('should calculate subtotal, discount, 8% VAT, and skip CANCELLED items in provisional bill', async () => {
    prisma.table.findUnique.mockResolvedValue({
      id: 'tbl-1',
      branchId: 'branch-1',
      tableNumber: 'T-01',
      displayName: 'Bàn 01',
      branch: { name: 'Chi nhánh 1', address: '72 Lê Lợi', phoneNumber: '028' },
    });
    prisma.orderSession.findFirst.mockResolvedValue({
      id: 'sess-1',
      guestCount: 2,
      openedAt: new Date(),
      orders: [
        {
          items: [
            {
              productId: 'p1',
              price: '50000',
              quantity: 2,
              status: OrderItemStatus.READY,
              product: { id: 'p1', name: 'Bánh Mì Xá Xíu', price: '50000' },
              modifiers: [{ extraPrice: '10000', itemModifier: { id: 'm1', name: 'Size L' } }],
            },
            {
              productId: 'p2',
              price: '40000',
              quantity: 1,
              status: OrderItemStatus.CANCELLED,
              product: { id: 'p2', name: 'Món đã huỷ', price: '40000' },
              modifiers: [],
            },
          ],
        },
      ],
    });
    prisma.invoice.findUnique.mockResolvedValue(null);
    prisma.invoice.create.mockImplementation(async ({ data }) => ({
      id: 'inv-1',
      ...data,
      account: { id: 'u1', fullName: 'Trần Thị Thu', username: 'cashier' },
    }));

    const bill = await service.createProvisionalInvoice(
      { tableId: 'tbl-1', discountPercent: 10 },
      { id: 'u1', username: 'cashier', role: Role.CASHIER, branchId: 'branch-1' },
    );

    // (50000 + 10000) * 2 = 120000; 10% discount = 12000; taxable = 108000; 8% VAT = 8640; final = 116640
    expect(bill.subtotal).toBe(120000);
    expect(bill.discountAmount).toBe(12000);
    expect(bill.taxPercent).toBe(8);
    expect(bill.taxAmount).toBe(8640);
    expect(bill.finalAmount).toBe(116640);
    expect(bill.items).toHaveLength(1);
  });

  it('should settle CASH invoice, compute changeDue, close session, and release table', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      invoiceCode: 'INV-2026-101',
      orderSessionId: 'sess-1',
      branchId: 'branch-1',
      finalAmount: '116640',
      paymentStatus: PaymentStatus.PENDING,
      orderSession: { tableId: 'tbl-1', table: { tableNumber: 'T-01' } },
      branch: { id: 'branch-1' },
    });

    const tx = {
      invoice: {
        update: jest.fn().mockResolvedValue({
          id: 'inv-1',
          invoiceCode: 'INV-2026-101',
          account: { id: 'u1', fullName: 'Trần Thị Thu', username: 'cashier' },
        }),
      },
      orderSession: { update: jest.fn() },
      table: {
        update: jest.fn().mockResolvedValue({ id: 'tbl-1', status: TableStatus.AVAILABLE }),
      },
    };
    prisma.$transaction.mockImplementation(async (cb: (client: typeof tx) => unknown) => cb(tx));

    const res = await service.settleInvoice(
      { invoiceId: 'inv-1', paymentMethod: PaymentMethod.CASH, cashGiven: 200000 },
      { id: 'u1', username: 'cashier', role: Role.CASHIER, branchId: 'branch-1' },
    );

    expect(res.success).toBe(true);
    expect(res.invoice.changeDue).toBe(83360);
    expect(res.table.status).toBe(TableStatus.AVAILABLE);
    expect(tx.orderSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: SessionStatus.CLOSED }) }),
    );
    expect(tx.table.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: TableStatus.AVAILABLE, qrToken: null }),
      }),
    );
    expect(eventsGateway.emitTableUpdated).toHaveBeenCalledTimes(1);
  });

  it('should reject CASH settlement when cashGiven is less than finalAmount', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      branchId: 'branch-1',
      finalAmount: '150000',
      paymentStatus: PaymentStatus.PENDING,
      orderSession: { tableId: 'tbl-1', table: { tableNumber: 'T-01' } },
    });

    await expect(
      service.settleInvoice(
        { invoiceId: 'inv-1', paymentMethod: PaymentMethod.CASH, cashGiven: 100000 },
        { id: 'u1', username: 'cashier', role: Role.CASHIER, branchId: 'branch-1' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should forbid cross-branch cashier from settling invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'inv-1',
      branchId: 'branch-2',
      finalAmount: '100000',
      paymentStatus: PaymentStatus.PENDING,
      orderSession: { tableId: 'tbl-1', table: { tableNumber: 'T-01' } },
    });

    await expect(
      service.settleInvoice(
        { invoiceId: 'inv-1', paymentMethod: PaymentMethod.VIETQR },
        { id: 'u1', username: 'cashier', role: Role.CASHIER, branchId: 'branch-1' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
