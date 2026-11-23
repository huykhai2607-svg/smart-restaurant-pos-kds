import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { account: { findFirst: jest.Mock; findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(() => {
    prisma = {
      account: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    };
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  it('should login successfully with valid username and password', async () => {
    const hashedPassword = await bcrypt.hash('123456', 4);
    prisma.account.findFirst.mockResolvedValue({
      id: 'acc-1',
      username: 'cashier',
      email: 'cashier@smartpos.vn',
      password: hashedPassword,
      role: Role.CASHIER,
      branchId: 'branch-1',
    });
    prisma.account.findUnique.mockResolvedValue({
      id: 'acc-1',
      username: 'cashier',
      email: 'cashier@smartpos.vn',
      fullName: 'Trần Thị Thu',
      role: Role.CASHIER,
      branchId: 'branch-1',
      branch: { id: 'branch-1', name: 'Chi nhánh 1', address: '72 Lê Lợi', phoneNumber: '028' },
    });

    const result = await service.login({ username: '  Cashier  ', password: '123456' });

    expect(result.accessToken).toBe('mock-jwt-token');
    expect(result.tokenType).toBe('Bearer');
    expect(result.user.role).toBe(Role.CASHIER);
    expect((result.user as Record<string, unknown>).password).toBeUndefined();
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'acc-1',
      username: 'cashier',
      role: Role.CASHIER,
      branchId: 'branch-1',
    });
  });

  it('should reject login with wrong password', async () => {
    const hashedPassword = await bcrypt.hash('123456', 4);
    prisma.account.findFirst.mockResolvedValue({
      id: 'acc-1',
      username: 'admin',
      email: 'admin@smartpos.vn',
      password: hashedPassword,
      role: Role.ADMIN,
      branchId: 'branch-1',
    });

    await expect(service.login({ username: 'admin', password: 'wrong' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject login when account does not exist', async () => {
    prisma.account.findFirst.mockResolvedValue(null);

    await expect(service.login({ username: 'ghost', password: '123456' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw NotFoundException in getProfile for unknown account', async () => {
    prisma.account.findUnique.mockResolvedValue(null);

    await expect(service.getProfile('unknown-id')).rejects.toThrow(NotFoundException);
  });
});
