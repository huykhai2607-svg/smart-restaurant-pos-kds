import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SplitTableDto {
  @ApiProperty({ example: 'tbl-1', description: 'ID bàn nguồn đang có khách' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn bàn nguồn cần tách' })
  fromTableId: string;

  @ApiProperty({ example: 'tbl-2', description: 'ID bàn đích đang trống' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn bàn đích để tách sang' })
  toTableId: string;

  @ApiProperty({
    example: ['item-uuid-1'],
    description: 'Danh sách ID các món (OrderItem) cần tách sang bàn mới',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Vui lòng chọn ít nhất 1 món để tách bàn' })
  @IsString({ each: true })
  orderItemIds: string[];
}
