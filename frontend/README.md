# Smart Restaurant POS & KDS — Frontend WebApp

Giao diện người dùng đa vai trò xây dựng bằng **Next.js 16 (App Router + Turbopack)**, **React 19**, **Tailwind CSS 4**, **Zustand 5** và **Socket.io Client 4.8**.

## Yêu cầu môi trường
- **Node.js** `>= 20.9.0` (LTS)
- **Backend API** đang chạy tại `http://localhost:4000`

## Cấu hình biến môi trường (`.env.local`)

Tạo file `.env.local` trong thư mục `frontend/` (nếu không tạo, ứng dụng sẽ dùng giá trị mặc định bên dưới):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

## Cài đặt & Khởi chạy

```bash
# Cài đặt dependencies
npm install

# Chạy chế độ phát triển (cổng 3000)
npm run dev

# Build production & chạy production
npm run build
npm run start

# Kiểm tra lint
npm run lint
```

> Trên Windows PowerShell bị chặn `.ps1`, dùng `npm.cmd` hoặc chạy trên `cmd`.

## Các phân hệ giao diện

| Đường dẫn | Phân hệ | Đối tượng sử dụng |
| :--- | :--- | :--- |
| `/login` | Cổng đăng nhập RBAC (có 1-Click Fast Login) | Nhân viên & Quản trị |
| `/table/[id]` | Thực đơn điện tử E-Menu tại bàn (VD: `/table/T-01`) | Khách hàng quét QR |
| `/kds` | Màn hình điều phối bếp realtime & gom món | Đầu bếp (`cook`) |
| `/pos` | Trạm thu ngân, sơ đồ bàn, in tạm tính, VietQR & thu tiền | Thu ngân (`cashier`) |
| `/admin` | Quản trị công thức BOM, tồn kho, nhập kho & báo cáo | Quản trị viên (`admin`) |
