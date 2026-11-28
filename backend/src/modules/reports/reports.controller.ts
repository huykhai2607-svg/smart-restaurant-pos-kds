import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService, type ReportRange } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth.interface';

@ApiTags('7. Reports & Branches (Báo cáo & Chi nhánh)')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /** Lấy báo cáo doanh thu ngày theo chi nhánh của tài khoản đăng nhập */
  @ApiOperation({ summary: 'Báo cáo doanh thu theo chi nhánh của tài khoản đang đăng nhập' })
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', 'all'] })
  @Get('daily')
  @Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)
  getDailyReport(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
    @Query('range') range?: ReportRange,
  ) {
    const effectiveBranchId = user.branchId || branchId || 'branch-1';
    return this.reportsService.getDailyReport(effectiveBranchId, date, range || 'today');
  }

  /** Thống kê tổng quan toàn bộ chuỗi (Chỉ xem / Read-Only cho Quản trị viên) */
  @ApiOperation({ summary: 'Thống kê tổng quan toàn bộ hệ thống (Chỉ xem - Read-Only)' })
  @ApiQuery({ name: 'range', required: false, enum: ['today', '7d', 'all'] })
  @Get('system-overview')
  @Roles(Role.ADMIN, Role.MANAGER)
  getSystemOverview(@Query('range') range?: ReportRange) {
    return this.reportsService.getSystemOverview(range || 'all');
  }
}
