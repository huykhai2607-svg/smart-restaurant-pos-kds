import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ReportRange = 'today' | '7d' | 'all';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildPaidAtFilter(dateStr?: string, range: ReportRange = 'today') {
    if (range === 'all') {
      return undefined;
    }

    if (range === '7d') {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { gte: start, lte: end };
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    return { gte: startOfDay, lte: endOfDay };
  }

  /** Lấy báo cáo doanh thu và món bán chạy theo chi nhánh */
  async getDailyReport(branchId: string, dateStr?: string, range: ReportRange = 'today') {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Chi nhánh với ID ${branchId} không tồn tại`);
    }

    const paidAtFilter = this.buildPaidAtFilter(dateStr, range);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        branchId,
        paymentStatus: PaymentStatus.PAID,
        ...(paidAtFilter ? { paidAt: paidAtFilter } : {}),
      },
      include: {
        orderSession: {
          include: {
            orders: {
              include: {
                items: {
                  include: {
                    product: { select: { id: true, name: true, price: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let totalSubtotal = 0;

    const paymentBreakdown = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.VIETQR]: 0,
      [PaymentMethod.CARD]: 0,
    };

    const itemSalesMap = new Map<
      string,
      { productId: string; name: string; quantity: number; revenue: number }
    >();

    for (const inv of invoices) {
      const finalAmt = Number(inv.finalAmount);
      totalRevenue += finalAmt;
      totalDiscount += Number(inv.discountAmount);
      totalTax += Number(inv.taxAmount);
      totalSubtotal += Number(inv.subtotal);

      if (paymentBreakdown[inv.paymentMethod] !== undefined) {
        paymentBreakdown[inv.paymentMethod] += finalAmt;
      }

      for (const order of inv.orderSession.orders) {
        for (const item of order.items) {
          const prodId = item.productId;
          const prodName = item.product.name;
          const itemRev = Number(item.price) * item.quantity;

          if (itemSalesMap.has(prodId)) {
            const current = itemSalesMap.get(prodId)!;
            current.quantity += item.quantity;
            current.revenue += itemRev;
          } else {
            itemSalesMap.set(prodId, {
              productId: prodId,
              name: prodName,
              quantity: item.quantity,
              revenue: itemRev,
            });
          }
        }
      }
    }

    const topSellingItems = Array.from(itemSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const totalInvoices = invoices.length;
    const averageOrderValue =
      totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0;

    return {
      branchId,
      branchName: branch.name,
      range,
      reportDate: (dateStr ? new Date(dateStr) : new Date()).toISOString().split('T')[0],
      totalRevenue,
      totalInvoices,
      averageOrderValue,
      totalSubtotal,
      totalDiscount,
      totalTax,
      paymentBreakdown,
      topSellingItems,
    };
  }

  /**
   * Thống kê tổng quan toàn bộ hệ thống (Chỉ xem / Read-Only)
   * Tổng hợp doanh thu, số đơn, phương thức thanh toán, top món bán chạy và so sánh từng chi nhánh.
   */
  async getSystemOverview(range: ReportRange = 'all') {
    const paidAtFilter = this.buildPaidAtFilter(undefined, range);

    const [branches, invoices, inventories] = await Promise.all([
      this.prisma.branch.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { tables: true } },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.invoice.findMany({
        where: {
          paymentStatus: PaymentStatus.PAID,
          ...(paidAtFilter ? { paidAt: paidAtFilter } : {}),
        },
        include: {
          orderSession: {
            include: {
              orders: {
                include: {
                  items: {
                    include: {
                      product: { select: { id: true, name: true, price: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.inventory.findMany({
        select: {
          branchId: true,
          currentStock: true,
          minSafetyStock: true,
        },
      }),
    ]);

    const lowStockByBranch = new Map<string, number>();
    for (const inv of inventories) {
      if (Number(inv.currentStock) <= Number(inv.minSafetyStock)) {
        lowStockByBranch.set(inv.branchId, (lowStockByBranch.get(inv.branchId) || 0) + 1);
      }
    }

    const branchStatsMap = new Map<
      string,
      {
        branchId: string;
        branchName: string;
        address: string;
        phoneNumber: string | null;
        totalTables: number;
        totalRevenue: number;
        totalInvoices: number;
        totalItemsSold: number;
        lowStockCount: number;
        paymentBreakdown: Record<PaymentMethod, number>;
      }
    >();

    for (const b of branches) {
      branchStatsMap.set(b.id, {
        branchId: b.id,
        branchName: b.name,
        address: b.address,
        phoneNumber: b.phoneNumber,
        totalTables: b._count.tables,
        totalRevenue: 0,
        totalInvoices: 0,
        totalItemsSold: 0,
        lowStockCount: lowStockByBranch.get(b.id) || 0,
        paymentBreakdown: {
          [PaymentMethod.CASH]: 0,
          [PaymentMethod.VIETQR]: 0,
          [PaymentMethod.CARD]: 0,
        },
      });
    }

    let totalRevenue = 0;
    let totalItemsSold = 0;
    const systemPaymentBreakdown: Record<PaymentMethod, number> = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.VIETQR]: 0,
      [PaymentMethod.CARD]: 0,
    };
    const itemSalesMap = new Map<
      string,
      { productId: string; name: string; quantity: number; revenue: number }
    >();

    for (const inv of invoices) {
      const finalAmt = Number(inv.finalAmount);
      totalRevenue += finalAmt;
      if (systemPaymentBreakdown[inv.paymentMethod] !== undefined) {
        systemPaymentBreakdown[inv.paymentMethod] += finalAmt;
      }

      const bStat = branchStatsMap.get(inv.branchId);
      if (bStat) {
        bStat.totalRevenue += finalAmt;
        bStat.totalInvoices += 1;
        if (bStat.paymentBreakdown[inv.paymentMethod] !== undefined) {
          bStat.paymentBreakdown[inv.paymentMethod] += finalAmt;
        }
      }

      for (const order of inv.orderSession.orders) {
        for (const item of order.items) {
          totalItemsSold += item.quantity;
          if (bStat) {
            bStat.totalItemsSold += item.quantity;
          }

          const prodId = item.productId;
          const prodName = item.product.name;
          const itemRev = Number(item.price) * item.quantity;

          if (itemSalesMap.has(prodId)) {
            const cur = itemSalesMap.get(prodId)!;
            cur.quantity += item.quantity;
            cur.revenue += itemRev;
          } else {
            itemSalesMap.set(prodId, {
              productId: prodId,
              name: prodName,
              quantity: item.quantity,
              revenue: itemRev,
            });
          }
        }
      }
    }

    const totalInvoices = invoices.length;
    const totalLowStockAlerts = Array.from(lowStockByBranch.values()).reduce(
      (sum, c) => sum + c,
      0,
    );

    const branchComparison = Array.from(branchStatsMap.values())
      .map((b) => ({
        ...b,
        averageOrderValue:
          b.totalInvoices > 0 ? Math.round(b.totalRevenue / b.totalInvoices) : 0,
        revenueSharePercent:
          totalRevenue > 0 ? Math.round((b.totalRevenue / totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const topSellingItems = Array.from(itemSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    return {
      range,
      generatedAt: new Date().toISOString(),
      totals: {
        totalRevenue,
        totalInvoices,
        averageOrderValue:
          totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0,
        totalItemsSold,
        totalBranches: branches.length,
        totalLowStockAlerts,
      },
      paymentBreakdown: systemPaymentBreakdown,
      branches: branchComparison,
      topSellingItems,
    };
  }
}

