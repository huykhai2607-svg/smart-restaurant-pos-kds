import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TableTokenService } from './table-token.service';

describe('TableTokenService', () => {
  let service: TableTokenService;
  let prisma: { table: { findUnique: jest.Mock; update: jest.Mock } };
  let config: { getOrThrow: jest.Mock; get: jest.Mock };

  beforeEach(() => {
    prisma = {
      table: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    config = {
      getOrThrow: jest.fn().mockReturnValue('test-hmac-secret-key-2026'),
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };
    service = new TableTokenService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  it('should issue a signed HMAC QR token and verify it successfully', async () => {
    prisma.table.findUnique.mockResolvedValueOnce({
      id: 'tbl-1',
      branchId: 'branch-1',
      tableNumber: 'T-01',
      qrToken: null,
    });
    let savedNonce = '';
    prisma.table.update.mockImplementation(async ({ data }) => {
      savedNonce = data.qrToken;
      return { id: 'tbl-1', qrToken: savedNonce };
    });

    const issued = await service.issueQr(
      'tbl-1',
      { id: 'u1', username: 'cashier', role: Role.CASHIER, branchId: 'branch-1' },
      false,
    );

    expect(issued.tableId).toBe('tbl-1');
    expect(issued.rotated).toBe(true);
    expect(issued.url).toContain('http://localhost:3000/table/tbl-1?t=');
    expect(issued.token.split('.')).toHaveLength(3);

    prisma.table.findUnique.mockResolvedValueOnce({
      id: 'tbl-1',
      branchId: 'branch-1',
      tableNumber: 'T-01',
      qrToken: savedNonce,
      branch: { isActive: true },
    });

    const verified = await service.verify(issued.token);
    expect(verified).toEqual({
      tableId: 'tbl-1',
      branchId: 'branch-1',
      tableNumber: 'T-01',
    });
  });

  it('should forbid staff (including ADMIN) from issuing QR for another branch', async () => {
    prisma.table.findUnique.mockResolvedValueOnce({
      id: 'tbl-2',
      branchId: 'branch-2',
      tableNumber: 'T-02',
      qrToken: 'nonce',
    });

    await expect(
      service.issueQr('tbl-2', {
        id: 'u1',
        username: 'cashier_hcm',
        role: Role.CASHIER,
        branchId: 'branch-1',
      }),
    ).rejects.toThrow(ForbiddenException);

    prisma.table.findUnique.mockResolvedValueOnce({
      id: 'tbl-2',
      branchId: 'branch-2',
      tableNumber: 'T-02',
      qrToken: 'nonce',
    });

    await expect(
      service.issueQr('tbl-2', {
        id: 'u2',
        username: 'admin_hcm',
        role: Role.ADMIN,
        branchId: 'branch-1',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if table does not exist', async () => {
    prisma.table.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.issueQr('missing', {
        id: 'u1',
        username: 'admin',
        role: Role.ADMIN,
        branchId: 'branch-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject missing, malformed, or tampered tokens', async () => {
    await expect(service.verify(undefined)).rejects.toThrow(UnauthorizedException);
    await expect(service.verify('invalid-token')).rejects.toThrow(UnauthorizedException);
    await expect(service.verify('tbl-1.nonce.forgedsignature')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject token when nonce has been rotated/revoked', async () => {
    prisma.table.findUnique.mockResolvedValueOnce({
      id: 'tbl-1',
      branchId: 'branch-1',
      tableNumber: 'T-01',
      qrToken: 'old-nonce',
    });
    const issued = await service.issueQr('tbl-1', {
      id: 'u1',
      username: 'admin',
      role: Role.ADMIN,
      branchId: 'branch-1',
    });

    // Simulate rotated nonce in DB
    prisma.table.findUnique.mockResolvedValueOnce({
      id: 'tbl-1',
      branchId: 'branch-1',
      tableNumber: 'T-01',
      qrToken: 'new-nonce',
      branch: { isActive: true },
    });

    await expect(service.verify(issued.token)).rejects.toThrow(UnauthorizedException);
  });
});
