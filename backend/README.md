# Smart Restaurant POS & KDS — Backend API

Backend service xây dựng bằng **NestJS 12**, **Prisma ORM 5.22**, **Supabase PostgreSQL**, **Socket.io 4.8** và tài liệu API tự động **Swagger / OpenAPI**.

## Yêu cầu môi trường
- **Node.js** `>= 20.9.0` (LTS)
- **PostgreSQL / Supabase PostgreSQL** (hỗ trợ Transaction Pooler cổng `6543` và Session Pooler cổng `5432`)

## Cấu hình biến môi trường (`.env`)

Tạo file `.env` từ `.env.example` và điền các giá trị thực tế (không commit `.env` lên Git):

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"
PORT=4000
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="12h"
TABLE_QR_SECRET="your-table-qr-hmac-secret"
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
```

## Cài đặt & Khởi tạo Database

```bash
# Cài đặt dependencies
npm install

# Đẩy schema lên PostgreSQL / Supabase
npx prisma db push

# Sinh Prisma Client
npx prisma generate

# Nạp dữ liệu mẫu (chi nhánh, tài khoản RBAC, bàn, thực đơn, BOM, tồn kho)
npx prisma db seed
```

> Trên Windows PowerShell bị chặn `.ps1`, dùng `npm.cmd` / `npx.cmd` hoặc chạy trên `cmd`.

## Lệnh chạy & Kiểm thử

```bash
# Chế độ phát triển (watch mode)
npm run start:dev

# Build production
npm run build

# Chạy bản production
npm run start:prod

# Lint & Test
npm run lint
npm run test
npm run test:e2e
```

## Endpoints & Realtime Gateway

- **Base API**: `http://localhost:4000/api`
- **Swagger UI**: `http://localhost:4000/api/docs`
- **Các nhóm API chính**:
  - `/api/auth` — Đăng nhập JWT & thông tin người dùng hiện tại
  - `/api/branches` — Danh sách chi nhánh
  - `/api/tables` & `/api/table-access` — Sơ đồ bàn, chuyển/gộp bàn, phát hành & xác thực QR HMAC
  - `/api/menu` — Danh mục, sản phẩm, trạm bếp & tùy chọn (modifiers)
  - `/api/orders` — Gửi đơn, màn hình bếp KDS, cập nhật trạng thái món & yêu cầu thanh toán
  - `/api/bom` & `/api/inventory` — Công thức định lượng nguyên liệu (BOM), tồn kho, nhập kho & audit log
  - `/api/invoices` & `/api/reports` — Phiếu tạm tính, thanh toán (Tiền mặt / VietQR / Thẻ) & báo cáo doanh thu ngày
- **Socket.io Rooms** (`http://localhost:4000`): `join:branch`, `join:pos`, `join:kitchen`, `join:table`.
