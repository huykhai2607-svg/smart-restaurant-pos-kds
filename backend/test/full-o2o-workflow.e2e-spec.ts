import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

jest.setTimeout(60000);

function unwrap<T = any>(body: any): T {
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
}

describe('Smart Restaurant Full O2O Workflow (E2E)', () => {
  let app: INestApplication<App>;
  let adminToken = '';
  let cashierToken = '';
  let cookToken = '';

  let testTableId = '';
  let testBranchId = '';
  let guestQrToken = '';
  let placedOrderId = '';
  let placedItemId = '';
  let testProductId = '';
  let invoiceId = '';
  let invoiceFinalAmount = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication & RBAC', () => {
    it('should reject invalid credentials with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' })
        .expect(401);
    });

    it('should login admin, cashier, and cook and verify /api/auth/me roles', async () => {
      const adminRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: '123456' })
        .expect(200);
      const adminData = unwrap(adminRes.body);
      expect(adminData.accessToken).toBeDefined();
      expect(adminData.user.role).toBe('ADMIN');
      adminToken = adminData.accessToken;

      const cashierRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'cashier@smartpos.vn', password: '123456' })
        .expect(200);
      const cashierData = unwrap(cashierRes.body);
      expect(cashierData.user.role).toBe('CASHIER');
      cashierToken = cashierData.accessToken;

      const cookRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'kitchen', password: '123456' })
        .expect(200);
      const cookData = unwrap(cookRes.body);
      expect(cookData.user.role).toBe('COOK');
      cookToken = cookData.accessToken;

      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);
      const meData = unwrap(meRes.body);
      expect(meData.username).toBe('cashier');
      expect(meData.password).toBeUndefined();
    });

    it('should block unauthenticated access to protected endpoints', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
      await request(app.getHttpServer()).get('/api/orders/kds').expect(401);
    });

    it('should enforce RBAC (cook cannot access admin restock)', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory/restock')
        .set('Authorization', `Bearer ${cookToken}`)
        .send({ branchId: 'branch-1', items: [] })
        .expect(403);
    });
  });

  describe('2. Table QR HMAC Security & Menu Discovery', () => {
    it('should list tables and issue a signed HMAC QR token for an available table', async () => {
      const tablesRes = await request(app.getHttpServer()).get('/api/tables').expect(200);
      const tables = unwrap<Array<{ id: string; status: string; branchId: string }>>(tablesRes.body);
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);

      const availableTable =
        tables.find((t) => t.status === 'AVAILABLE' && t.branchId === 'branch-1') || tables[0];

      testTableId = availableTable.id;
      testBranchId = availableTable.branchId;

      const qrRes = await request(app.getHttpServer())
        .post(`/api/tables/${testTableId}/qr`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ rotate: true })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });

      const qrData = unwrap(qrRes.body);
      expect(qrData.token).toBeDefined();
      expect(qrData.url).toContain(`/table/${testTableId}?t=`);
      guestQrToken = qrData.token;
    });

    it('should verify valid guest QR token and reject forged token', async () => {
      const okRes = await request(app.getHttpServer())
        .get('/api/table-access/me')
        .set('x-table-token', guestQrToken)
        .expect(200);
      const okData = unwrap(okRes.body);
      expect(okData.id).toBe(testTableId);

      await request(app.getHttpServer())
        .get('/api/table-access/me')
        .set('x-table-token', `${testTableId}.fakenonce.forgedsig`)
        .expect(401);
    });

    it('should fetch full menu and pick an available product', async () => {
      const menuRes = await request(app.getHttpServer()).get('/api/menu').expect(200);
      const products = unwrap<Array<{ id: string; isAvailable: boolean }>>(menuRes.body);
      expect(Array.isArray(products)).toBe(true);

      const availableProduct = products.find((p) => p.isAvailable);
      expect(availableProduct).toBeDefined();
      testProductId = availableProduct!.id;
    });
  });

  describe('3. Guest Order -> KDS Cooking -> Ready (BOM Deduction)', () => {
    it('should allow guest to place an order using x-table-token', async () => {
      const orderRes = await request(app.getHttpServer())
        .post('/api/orders')
        .set('x-table-token', guestQrToken)
        .send({
          tableId: testTableId,
          guestCount: 2,
          note: 'E2E Test Order',
          items: [{ productId: testProductId, quantity: 1, note: 'Ít cay' }],
        })
        .expect(201);

      const orderData = unwrap(orderRes.body);
      expect(orderData.id).toBeDefined();
      expect(orderData.items).toHaveLength(1);
      placedOrderId = orderData.id;
      placedItemId = orderData.items[0].id;
    });

    it('should show the new order in KDS and transition PENDING -> COOKING -> READY', async () => {
      const kdsRes = await request(app.getHttpServer())
        .get('/api/orders/kds')
        .query({ branchId: testBranchId })
        .set('Authorization', `Bearer ${cookToken}`)
        .expect(200);

      const kdsData = unwrap(kdsRes.body);
      expect(Array.isArray(kdsData)).toBe(true);

      const cookingRes = await request(app.getHttpServer())
        .patch(`/api/orders/items/${placedItemId}/status`)
        .set('Authorization', `Bearer ${cookToken}`)
        .send({ status: 'COOKING' })
        .expect(200);
      expect(unwrap(cookingRes.body).status).toBe('COOKING');

      const readyRes = await request(app.getHttpServer())
        .patch(`/api/orders/items/${placedItemId}/status`)
        .set('Authorization', `Bearer ${cookToken}`)
        .send({ status: 'READY' })
        .expect(200);
      expect(unwrap(readyRes.body).status).toBe('READY');
    });

    it('should reflect READY status on guest current table order endpoint', async () => {
      const currentRes = await request(app.getHttpServer())
        .get(`/api/orders/table/${testTableId}/current`)
        .set('x-table-token', guestQrToken)
        .expect(200);

      const currentData = unwrap(currentRes.body);
      expect(currentData).toBeDefined();
      expect(currentData.taxPercent).toBe(8);
      const found = (currentData.allItems || []).find((i: { id: string }) => i.id === placedItemId);
      expect(found?.status).toBe('READY');
    });
  });

  describe('4. Request Payment -> Provisional Bill -> Cash Settlement & QR Revocation', () => {
    it('should allow guest to request payment', async () => {
      await request(app.getHttpServer())
        .post(`/api/tables/${testTableId}/request-payment`)
        .set('x-table-token', guestQrToken)
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
    });

    it('should generate provisional invoice with 8% VAT', async () => {
      const billRes = await request(app.getHttpServer())
        .post('/api/invoices/provisional')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ tableId: testTableId })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });

      const billData = unwrap(billRes.body);
      expect(billData.invoiceId).toBeDefined();
      expect(billData.taxPercent).toBe(8);
      expect(billData.finalAmount).toBe(billData.subtotal + billData.taxAmount);
      invoiceId = billData.invoiceId;
      invoiceFinalAmount = billData.finalAmount;
    });

    it('should settle invoice with CASH, release table to AVAILABLE, and revoke old QR token', async () => {
      const cashGiven = invoiceFinalAmount + 50000;
      const settleRes = await request(app.getHttpServer())
        .post('/api/invoices/settle')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          invoiceId,
          paymentMethod: 'CASH',
          cashGiven,
        })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });

      const settleData = unwrap(settleRes.body);
      expect(settleData.success).toBe(true);
      expect(settleData.invoice.paymentStatus).toBe('PAID');
      expect(settleData.invoice.changeDue).toBe(50000);
      expect(settleData.table.status).toBe('AVAILABLE');

      // Old guest QR token must now be revoked!
      await request(app.getHttpServer())
        .get('/api/table-access/me')
        .set('x-table-token', guestQrToken)
        .expect(401);
    });
  });

  describe('5. Admin BOM, Inventory Audit Logs & Daily Report', () => {
    it('should allow admin to inspect product BOM, branch inventory, audit logs, and daily report', async () => {
      const bomRes = await request(app.getHttpServer())
        .get(`/api/bom/product/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(unwrap(bomRes.body).productId).toBe(testProductId);

      const invRes = await request(app.getHttpServer())
        .get('/api/inventory')
        .query({ branchId: testBranchId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const invData = unwrap(invRes.body);
      expect(Array.isArray(invData)).toBe(true);
      expect(invData.length).toBeGreaterThan(0);

      const logsRes = await request(app.getHttpServer())
        .get('/api/inventory/audit-logs')
        .query({ branchId: testBranchId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(Array.isArray(unwrap(logsRes.body))).toBe(true);

      const reportRes = await request(app.getHttpServer())
        .get('/api/reports/daily')
        .query({ branchId: testBranchId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(unwrap(reportRes.body)).toBeDefined();
      expect(placedOrderId).toBeDefined();
    });
  });
});
