# 🍽️ SMART RESTAURANT POS & KDS SYSTEM
### Hệ Thống Quản Lý Nhà Hàng Thông Minh & Gọi Món Khép Kín O2O (Online-to-Offline)

> **Dự án tốt nghiệp / Đồ án chuyên ngành F&B Technology**  
> Giải pháp chuyển đổi số toàn diện cho chuỗi nhà hàng: Thực đơn điện tử tự phục vụ tại bàn qua mã QR bảo mật HMAC $\leftrightarrow$ Điều phối bếp thời gian thực (KDS Realtime) $\leftrightarrow$ Định lượng nguyên vật liệu tự động trừ kho (BOM Engine) $\leftrightarrow$ Trạm thu ngân bán hàng (POS Workstation) tích hợp VietQR động Napas 24/7.

---

## 📌 1. Danh Sách Tài Khoản Thử Nghiệm (Dành Cho Thầy / Giảng Viên Test)

Hệ thống được thiết lập cơ chế **Phân Quyền Vận Hành Nghiêm Ngặt (RBAC - Role-Based Access Control)**. Thầy có thể sử dụng các tài khoản bên dưới để kiểm tra toàn bộ luồng chức năng:

| Vai Trò (Role) | Họ & Tên | Email Đăng Nhập | Tên Đăng Nhập | Mật Khẩu | Đường Dẫn Truy Cập | Quyền Hạn & Chức Năng Chính |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Thu Ngân POS** (`cashier`) | **Trần Thị Thu** | `cashier@smartpos.vn` | `cashier` | `123456` | [`/pos`](http://localhost:3000/pos) | Quản lý sơ đồ bàn (Trống/Có khách/Chờ TT), gộp/đổi bàn, in Phiếu Tạm Tính, xuất mã VietQR động, thu tiền mặt (tự tính tiền thừa), giải phóng bàn. |
| **Đầu Bếp KDS** (`cook`) | **Đội Ngũ Bếp Trung Tâm** | `kitchen@smartpos.vn` | `kitchen` | `123456` | [`/kds`](http://localhost:3000/kds) | Nhận vé realtime (< 50ms), chuông báo âm thanh, đồng hồ Urgency Timer đếm ngược, chuyển trạng thái "Nấu" -> "Xong", kích hoạt trừ kho BOM, chế độ Gom Món (Aggregation). |
| **Quản Trị & Kho** (`admin`) | **Nguyễn Văn Minh** | `admin@smartpos.vn` | `admin` | `123456` | [`/admin`](http://localhost:3000/admin) | Cấu hình công thức định lượng BOM từng món, giám sát tồn kho nguyên liệu thời gian thực (3 mức cảnh báo), nhập kho tức thì (+ Nhập Kho), xem nhật ký xuất kho. |
| **Khách Hàng (Guest)** | *Khách Dùng Bữa* | *(Không cần tài khoản)* | *Khách Quét QR* | *HMAC Token* | [`/table/T-01`](http://localhost:3000/table/T-01) | Xem E-Menu tại bàn, tùy biến món (Size L, Topping, Ghi chú), giỏ hàng tự tính thuế VAT 8%, gửi đơn vào bếp, theo dõi trạng thái món, bấm "Yêu Cầu Thanh Toán". |

> [!TIP]
> **Tính năng Đăng Nhập Nhanh 1-Click (Fast Login):**  
> Tại trang đăng nhập [`http://localhost:3000/login`](http://localhost:3000/login), hệ thống đã tích hợp sẵn **3 nút bấm 1-Click theo vai trò** (Thu Ngân POS, Bếp KDS, Quản Trị BOM). Thầy chỉ cần bấm 1 click vào nút vai trò tương ứng là hệ thống sẽ tự động xác thực và chuyển hướng vào đúng giao diện làm việc ngay lập tức, không cần mất thời gian gõ email/mật khẩu thủ công!

---

## 🚀 2. Hướng Dẫn Cài Đặt & Khởi Chạy Dự Án (Getting Started)

### 2.1. Yêu Cầu Môi Trường (Prerequisites)
- **Node.js**: Phiên bản `>= 20.9.0` (Khuyến nghị bản **LTS** mới nhất — đã kiểm thử trên Node.js LTS `v26.x`)
- **Trình quản lý gói**: `npm` (đi kèm Node.js)
- **Git**
- **Cơ sở dữ liệu**: Supabase Managed PostgreSQL (hoặc PostgreSQL cục bộ)

> [!NOTE]
> Trên **Windows PowerShell**, nếu gặp lỗi Execution Policy chặn `npm.ps1`, hãy chạy bằng `npm.cmd` / `npx.cmd` hoặc sử dụng **Command Prompt (`cmd`)**.

---

### 2.2. Bước 1: Cấu Hình & Khởi Chạy Backend API (NestJS 12)

Mở cửa sổ Terminal thứ nhất:

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Tạo file biến môi trường .env từ mẫu (và điền chuỗi kết nối Supabase PostgreSQL)
cp .env.example .env

# 3. Cài đặt các thư viện phụ thuộc
npm install

# 4. Đẩy Prisma Schema lên Database & sinh Prisma Client
npx prisma db push
npx prisma generate

# 5. Nạp dữ liệu mẫu (3 chi nhánh, tài khoản RBAC, sơ đồ bàn, thực đơn, BOM & tồn kho)
npx prisma db seed

# 6. Khởi chạy Backend Server (chế độ phát triển)
npm run start:dev
```

- **Backend API URL**: `http://localhost:4000/api`
- **Swagger OpenAPI Docs**: `http://localhost:4000/api/docs`
- **Socket.io Realtime Server**: `http://localhost:4000`
- **Kiểm tra trạng thái**: Mở trình duyệt truy cập `http://localhost:4000/api/tables` hoặc `http://localhost:4000/api/menu` thấy trả về JSON dữ liệu là Backend đã kết nối Database thành công.

> [!IMPORTANT]
> File `backend/.env` nằm trong `.gitignore` nên không được commit lên Git. Khi clone dự án về máy mới hoặc đổi project Supabase, cần cấu hình đủ `DATABASE_URL` (Transaction Pooler cổng `6543` kèm `?pgbouncer=true`), `DIRECT_URL` (Session Pooler cổng `5432`), `JWT_SECRET`, `TABLE_QR_SECRET`, `CORS_ORIGIN` và `FRONTEND_URL` (xem mẫu trong `backend/.env.example`).

---

### 2.3. Bước 2: Cấu Hình & Khởi Chạy Frontend WebApp (Next.js 16)

Mở cửa sổ Terminal thứ hai:

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. (Tuỳ chọn) Tạo file .env.local nếu cần đổi địa chỉ Backend
# NEXT_PUBLIC_API_URL=http://localhost:4000/api
# NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# 3. Cài đặt thư viện dependencies
npm install

# 4. Khởi chạy Next.js Development Server
npm run dev
```

- **Frontend App URL**: `http://localhost:3000`
- **Cổng Đăng Nhập**: `http://localhost:3000/login`

---

### 2.4. (Tuỳ Chọn) Khởi Chạy Bằng Docker Compose

Nếu máy đã cài Docker Desktop, có thể khởi chạy đồng thời cả Backend và Frontend từ thư mục gốc:

```bash
docker compose up --build
```

---

## 🗺️ 3. Sơ Đồ Điều Hướng & Các Phân Hệ Chức Năng

```
http://localhost:3000/
│
├── 🔑 /login               -> Cổng Đăng Nhập Phân Quyền RBAC (Có sẵn 1-Click Fast Login)
│
├── 📱 /table/[id]          -> Thực Đơn Điện Tử E-Menu Khách Gọi Món (VD: /table/T-01, /table/T-02)
│                              • Tùy biến món (Size M/L, Toppings, Ghi chú đầu bếp)
│                              • Giỏ hàng tự tính VAT 8% & Gửi đơn WebSocket
│                              • Theo dõi tiến độ chế biến realtime & Bấm chuông "Yêu Cầu Thanh Toán"
│
├── 🍳 /kds                 -> Màn Hình Điều Phối Bếp KDS Realtime (Role: Cook)
│                              • Station Routing: Bếp Nóng, Bếp Lạnh, Quầy Pha Chế
│                              • Đồng hồ Urgency Timer cảnh báo trễ món trực quan
│                              • Bấm "Nấu" (Cooking) -> Bấm "Xong" (Hoàn tất & Trừ kho BOM)
│                              • Chế độ "Tổng Hợp Món" (Gom Món - Aggregation Mode)
│
├── 💻 /pos                 -> Trạm Thu Ngân POS & Sơ Đồ Bàn (Role: Cashier)
│                              • Sơ đồ phân khu: Tầng Trệt, Tầng 2 (VIP), Sân Vườn
│                              • Xem mã QR động HMAC-SHA256 phát hành tại từng bàn
│                              • Thông báo nổi khi có bàn bấm chuông yêu cầu tính tiền
│                              • In Phiếu Tạm Tính (Provisional Bill) kiểm tra trước
│                              • Xuất mã VietQR động chuẩn Napas 24/7 chứa đúng số tiền
│                              • Thu tiền mặt, tự tính tiền thừa (Change Due) & Giải phóng bàn
│
└── 📊 /admin               -> Cổng Quản Trị & Kho Định Lượng (Role: Admin)
                               • Cấu hình công thức định lượng nguyên vật liệu (BOM)
                               • Bảng kiểm soát tồn kho thời gian thực (Xanh / Vàng / Đỏ)
                               • Chức năng "+ Nhập Kho" bổ sung nguyên vật liệu tức thì
                               • Báo cáo doanh thu & hóa đơn trong ngày
```

---

## 🎯 4. Kịch Bản 5 Bước Test Nhanh Toàn Diện (5-Minute Test Walkthrough)

Thầy có thể mở song song 3 - 4 tab trình duyệt để quan sát dữ liệu đồng bộ hai chiều **Realtime (< 50ms)** giữa Khách Hàng - Bếp - Thu Ngân - Quản Trị Kho:

### 🔹 Bước 1: Khách đặt món tại bàn ăn
1. Mở tab trình duyệt thứ nhất: truy cập [`http://localhost:3000/table/T-01`](http://localhost:3000/table/T-01) (Bàn 01).
2. Chọn danh mục **Món Nóng** $\rightarrow$ Click chọn món **"Bánh Mì Thịt Xá Xíu Giòn Tan"**.
3. Tại modal tùy biến: Chọn **Size L (+10.000đ)**, chọn thêm topping **Trứng Ốp La (+7.000đ)**, nhập ghi chú: *"Nhiều nước sốt xá xíu đậm đà, ít ớt!"* $\rightarrow$ Bấm **"Thêm Vào Giỏ"**.
4. Chọn danh mục **Đồ Uống** $\rightarrow$ Click chọn **"Trà Đào Cam Sả Tươi Mát"** $\rightarrow$ Bấm **"Thêm Vào Giỏ"**.
5. Bấm vào thanh giỏ hàng nổi phía dưới $\rightarrow$ Xem bảng tổng hợp tiền món và thuế GTGT (VAT 8%) $\rightarrow$ Bấm **"GỬI ĐƠN VÀO BẾP"**.

### 🔹 Bước 2: Bếp tiếp nhận và chế biến (KDS Realtime)
1. Mở tab trình duyệt thứ hai: truy cập [`http://localhost:3000/kds`](http://localhost:3000/kds) *(hoặc từ trang login bấm nút 1-Click "Khu Vực Bếp")*.
2. Chuông báo âm thanh vang lên, vé order của bàn **T-01** xuất hiện tức thì kèm đồng hồ `Urgency Timer` đếm thời gian.
3. Đầu bếp bấm nút **"Nấu"** trên món ăn $\rightarrow$ Trạng thái chuyển sang màu cam *(Đang nấu)*.
4. Bấm nút **"Hoàn Tất Toàn Bộ Vé (Trừ Kho BOM)"** $\rightarrow$ Món ăn chuyển sang màu xanh lá *(Đã Xong)* và hệ thống tự động trừ kho nguyên liệu theo định lượng BOM.
5. Thầy có thể bấm nút **"Tổng Hợp Món"** trên thanh header để kiểm tra chế độ **Gom Món (Aggregation Mode)** tổng hợp số lượng món cần nấu theo từng trạm.

### 🔹 Bước 3: Khách theo dõi tiến độ món và yêu cầu thanh toán
1. Quay lại tab bàn ăn [`http://localhost:3000/table/T-01`](http://localhost:3000/table/T-01), chuyển sang tab **"Đơn Món"**.
2. Thanh tiến độ hiển thị trực quan: `100% Hoàn Thành (2/2 món)` với nhãn `✓ Xong` màu xanh lá.
3. Nút **"Yêu Cầu Thanh Toán"** sáng màu vàng và được kích hoạt $\rightarrow$ Bấm nút để gọi thu ngân chốt bill.

### 🔹 Bước 4: Thu ngân POS chốt bill và thanh toán
1. Mở tab trình duyệt thứ ba: truy cập [`http://localhost:3000/pos`](http://localhost:3000/pos) *(hoặc từ trang login bấm 1-Click "Thu Ngân & Bán Hàng")*.
2. Thanh cảnh báo nổi trên đầu màn hình hiện thông báo: *"Bàn T-01 đang cần thanh toán"*.
3. Click chọn bàn **T-01** $\rightarrow$ Cột bên phải hiển thị toàn bộ món ăn của bàn, tiền phụ thu VAT 8% và tổng thanh toán.
4. **Kiểm tra In Tạm Tính**: Bấm nút **"In Tạm Tính"** $\rightarrow$ Modal hiển thị mẫu hóa đơn tạm tính rõ ràng, có logo nhà hàng và mã tra cứu đơn $\rightarrow$ Đóng modal.
5. **Kiểm tra VietQR Động**: Bấm nút **"VietQR Động"** $\rightarrow$ Modal hiển thị mã VietQR chuẩn Napas 24/7 chứa chính xác số tiền cần trả và cú pháp chuyển khoản $\rightarrow$ Đóng modal.
6. **Thanh Toán Tiền Mặt**: Bấm nút **"Thanh Toán Tiền Mặt / Thẻ POS"** $\rightarrow$ Chọn nhanh mệnh giá `200.000 đ` $\rightarrow$ Hệ thống tự động tính tiền thừa trả khách $\rightarrow$ Bấm **"Xác Nhận Thu Tiền"**.
7. Bàn T-01 thanh toán thành công và ngay lập tức được giải phóng về trạng thái **Bàn Trống (Xanh lá)**.

### 🔹 Bước 5: Quản trị viên kiểm tra kho BOM
1. Mở tab trình duyệt thứ tư: truy cập [`http://localhost:3000/admin`](http://localhost:3000/admin) *(hoặc từ login bấm 1-Click "Quản Trị & Kho BOM")*.
2. Bấm nút **"Xem Chi Tiết Công Thức BOM"** của món Bánh Mì Thịt Xá Xíu để kiểm tra các nguyên liệu cấu thành (bánh mì, thịt xá xíu, rau ngò, sốt).
3. Chuyển sang tab **"Kho Nguyên Vật Liệu"**: Kiểm tra số lượng tồn kho thực tế đã được trừ chính xác sau khi bếp hoàn tất món ở Bước 2.
4. Bấm nút **"+ Nhập Kho"** trên nguyên liệu $\rightarrow$ Nhập số lượng cần bổ sung $\rightarrow$ Bấm **"Xác Nhận Nhập"** để thấy tồn kho được cộng thêm tức thì.

---

## 🛠️ 5. Công Nghệ Nền Tảng (Tech Stack)

| Thành Phần | Công Nghệ Sử Dụng | Mục Đích Triển Khai |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16 (App Router)**, React 19, TypeScript | Server Components, tối ưu hóa SEO, SSR/CSR linh hoạt, Client routing mượt mà. |
| **Giao Diện UI/UX** | **Tailwind CSS 4**, Lucide React Icons | Giao diện Dark Mode chuyên nghiệp, responsive cho cả Mobile (Khách hàng) và Tablet/Desktop (POS/KDS). |
| **State Management** | **Zustand 5** | Quản lý trạng thái giỏ hàng, phiên đăng nhập, đồng bộ dữ liệu Realtime không gây re-render thừa. |
| **Backend Framework** | **NestJS 12**, TypeScript, Express | Kiến trúc Module, Dependency Injection, Validation Pipe, Exception Filter chuẩn Enterprise. |
| **Thời Gian Thực** | **Socket.io 4.8** (`@nestjs/websockets`) | WebSocket hai chiều độ trễ siêu thấp (< 50ms) phân phòng theo chi nhánh và bàn (`room_branch`, `room_pos`, `room_kitchen`). |
| **Cơ Sở Dữ Liệu** | **Supabase Managed PostgreSQL** | CSDL quan hệ chuẩn ACID, Supavisor Connection Pooler chịu tải cao. |
| **ORM & Database Tool** | **Prisma ORM 5.22** | Type-safe database client, migration schema tự động, Database Transactions với Row-Level Locking. |
| **Bảo Mật & Xác Thực** | **Passport JWT & HMAC-SHA256** | Bảo vệ API cổng nhân sự bằng JWT Token; bảo vệ mã QR bàn bằng chữ ký số HMAC-SHA256 chống làm giả URL. |
| **Thanh Toán Không Tiền Mặt**| **VietQR Dynamic Generator (Napas 24/7)** | Sinh mã QR thanh toán ngân hàng tự động kèm số tiền và nội dung đơn hàng. |

---

## 👥 6. Quy Trình Làm Việc & Phát Triển Mã Nguồn (Git Workflow)

- **Nhánh `main`**: Nhánh mã nguồn chính thức, ổn định, sẵn sàng deploy. Nghiêm cấm commit trực tiếp lên `main`.
- **Nhánh tính năng (`feature/ten-tinh-nang`)**: Mỗi thành viên tự tạo nhánh riêng từ `main` để phát triển module:
  - `feature/auth-rbac`: Xác thực và phân quyền
  - `feature/pos-floorplan`: Sơ đồ bàn và xuất QR HMAC
  - `feature/kds-routing`: Điều phối bếp và gom món
  - `feature/bom-inventory`: Định lượng BOM và trừ kho
- **Quy ước Commit Message**:
  - `feat`: Tính năng mới
  - `fix`: Sửa lỗi hệ thống
  - `refactor`: Tái cấu trúc mã nguồn tối ưu hiệu năng
  - `docs`: Cập nhật tài liệu, README
  - `chore`: Cấu hình môi trường, cài đặt thư viện

---

© 2026 Smart Restaurant POS & KDS Project. All rights reserved.
