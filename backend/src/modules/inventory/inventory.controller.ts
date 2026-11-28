import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { RestockDto } from './dto/restock.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateSafetyStockDto } from './dto/update-safety-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/interfaces/auth.interface';
import { Role } from '@prisma/client';

@ApiTags('6. Inventory & BOM (Tồn kho & Định lượng)')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Danh sách toàn bộ nguyên vật liệu' })
  @Get('ingredients')
  async getIngredients() {
    return this.inventoryService.getIngredients();
  }

  @ApiOperation({ summary: 'Thêm nguyên vật liệu mới' })
  @Post('ingredients')
  @Roles(Role.ADMIN)
  async createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @ApiOperation({ summary: 'Xem tồn kho theo chi nhánh (hỗ trợ lọc LOW_STOCK, OUT_OF_STOCK)' })
  @Get()
  async getBranchInventory(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('filter') filter?: 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK',
  ) {
    const effectiveBranchId = user.branchId || branchId || 'branch-1';
    return this.inventoryService.getBranchInventory(effectiveBranchId, filter);
  }

  @ApiOperation({ summary: 'Nhập kho bổ sung nguyên vật liệu' })
  @Post('restock')
  @Roles(Role.ADMIN, Role.CASHIER)
  async restock(
    @CurrentUser() user: AuthUser,
    @Body() dto: RestockDto,
  ) {
    if (user.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('Bạn chỉ có quyền nhập kho cho chi nhánh của mình');
    }
    return this.inventoryService.restock({
      ...dto,
      branchId: user.branchId || dto.branchId,
    });
  }

  @ApiOperation({ summary: 'Cập nhật ngưỡng tồn kho an toàn tối thiểu' })
  @Patch('safety-stock')
  @Roles(Role.ADMIN)
  async updateSafetyStock(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSafetyStockDto,
  ) {
    if (user.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('Bạn chỉ có quyền cập nhật ngưỡng tồn kho cho chi nhánh của mình');
    }
    return this.inventoryService.updateSafetyStock({
      ...dto,
      branchId: user.branchId || dto.branchId,
    });
  }

  @ApiOperation({ summary: 'Nhật ký kiểm toán trừ kho tự động theo BOM' })
  @Get('audit-logs')
  async getAuditLogs(
    @CurrentUser() user: AuthUser,
    @Query('branchId') branchId?: string,
    @Query('ingredientId') ingredientId?: string,
    @Query('take') take?: string,
  ) {
    const effectiveBranchId = user.branchId || branchId || 'branch-1';
    return this.inventoryService.getAuditLogs(
      effectiveBranchId,
      ingredientId,
      take ? parseInt(take, 10) : 50,
    );
  }
}
