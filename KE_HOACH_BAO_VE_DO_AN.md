# 📋 KẾ HOẠCH HOÀN THIỆN & QUY TRÌNH BẢO VỆ ĐỒ ÁN
## ĐT 08 – Nhà Hàng, Gọi Món QR & Bếp (Smart POS & KDS)

> **Quy tắc chung khi bảo vệ:**
> - ❌ **Không làm PowerPoint.**
> - ✅ **Trước khi lên bục:** Mở sẵn các tab trình duyệt theo từng vai trò (**Actor**), chia sẵn **3 màn hình**, bật sẵn **CSDL (Database)** và **Log hệ thống (Backend Terminal)**.
> - ⏱️ **Thời lượng chuẩn:** Chỉ thực hiện đúng **3 bước cốt lõi** (tổng **11 phút**: 3 phút – 4 phút – 4 phút).

---

## 🎯 1. Bảng Yêu Cầu Đề Tài (3 Bước Cốt Lõi)

| Giai đoạn | Thời lượng | Yêu cầu cốt lõi cần chứng minh trực tiếp |
| :--- | :---: | :--- |
| **Bước 1: Nghiệp vụ khởi tạo** | **3 phút** | Chia 3 màn hình: Khách quét **QR tại bàn**, chọn món, chọn **Topping** và bấm đặt. |
| **Bước 2: Luồng xử lý cốt lõi & Realtime** | **4 phút** | Dưới **1 giây** (Socket.io), đơn **nổ chuông** và hiện lên màn hình **Bếp (KDS)** theo **đúng trạm chế biến** (Bếp Nóng / Bếp Lạnh / Quầy Pha Chế). |
| **Bước 3: Thử lửa AI / Chịu tải / Ngoại lệ** | **4 phút** | 1) Bếp bấm **Hoàn thành** → Kho **tự động trừ nguyên liệu theo công thức BOM**.<br>2) Khi nguyên liệu về **`0`** → Món trên QR khách **tự khóa "Hết hàng"**.<br>3) Thu ngân **tách/gộp bàn** & tạo **VietQR**. |

---

## 🔍 2. Đánh Giá Hiện Trạng Codebase (Gap Analysis)

Qua rà soát mã nguồn hiện tại trong `backend/` và `frontend/`:

| Hạng mục theo đề bài | Trạng thái | Hiện trạng trong code | Hành động cần làm |
| :--- | :---: | :--- | :--- |
| Khách quét QR tại bàn (HMAC) | ✅ Đã có | `TableQRModal` sinh QR HMAC-SHA256; `/table/[id]` xác thực token. | Giữ nguyên, kiểm tra mở nhanh URL QR. |
| Chọn món, Size, Topping & bấm đặt | ✅ Đã có | `/table/[id]` hỗ trợ Size, Mức cay, Topping (có `ModifierRecipe` BOM trong DB). | Kiểm tra `live-store.ts` gửi đủ `modifierIds` lên `POST /api/orders`. |
| Realtime `< 1 giây` bằng Socket.io | ✅ Đã có | `EventsGateway` phát `order:placed` & `kitchen:new_items` theo room chi nhánh/trạm. | Bổ sung log timestamp (ms) ở Terminal Backend để hội đồng dễ đối chiếu. |
| Đơn nổ chuông trên KDS | ✅ Đã có | `/kds` dùng Web Audio API phát chuông 880Hz khi có đơn mới. | Lưu ý: phải click 1 lần vào tab `/kds` trước khi demo để mở khóa Autoplay của Chrome. |
| Hiện lên KDS theo đúng trạm chế biến | ✅ Đã có | 3 trạm (`hot` Bếp Nóng, `cold` Bếp Lạnh, `bar` Quầy Pha Chế) + chế độ Gom Món. | Giữ nguyên. |
| Bếp bấm Hoàn thành → Tự trừ kho BOM | ✅ Đã có | `InventoryService.deductInventoryForOrderItem(s)` dùng Transaction + `SELECT ... FOR UPDATE` + ghi `inventory_audit_logs`. | Giữ nguyên, mở sẵn bảng DB để chứng minh. |
| **Nguyên liệu về `0` → Món trên QR tự khóa "Hết hàng"** | ✅ **Đã hoàn thiện** | `InventoryService.syncProductsAvailabilityForIngredients` tự cập nhật `product.isAvailable = false`, emit Socket.io `menu:availability_updated`; trang `/table/[id]` hiển thị món mờ + badge đỏ **"HẾT HÀNG"** bị khóa (và tự mở khóa khi Admin `+ Nhập Kho`). | Sẵn sàng demo. |
| **Thu ngân Tách bàn (Split Table)** | ✅ **Đã hoàn thiện** | Đã bổ sung API `POST /api/tables/split`, phát realtime `table:updated` cho `split`/`merge`/`transfer`, và giao diện nút + Modal **Tách Bàn** trên `/pos`. | Sẵn sàng demo. |
| **Thu ngân Gộp bàn (Merge Table)** | ✅ **Đã hoàn thiện** | `POST /api/tables/merge` + Modal Gộp bàn trên `/pos` + phát `table:updated` realtime. | Sẵn sàng demo. |
| **Tạo mã VietQR động** | ✅ **Đã hoàn thiện** | `VietQRModal` dùng ảnh VietQR động chuẩn Napas 24/7 (`img.vietqr.io`) quét thật được bằng app ngân hàng (tự động fallback khi mất mạng). | Sẵn sàng demo. |
| **Dữ liệu kho demo chạm mức `0`** | ✅ **Đã hoàn thiện** | `seed.ts` đã cấu hình `Cá hồi Na Uy phi lê tươi` (`ing-9`) = **`130g`** (vừa đủ 1 suất Salad 80g + 1 Topping cá hồi 50g → bấm Hoàn thành 1 lần về đúng `0g` và khóa món ngay). | Chạy `npx prisma db seed` trước khi bảo vệ. |

---

## 🛠️ 3. Kế Hoạch Hoàn Thiện Code Trước Bảo Vệ (Implementation Plan)

### Hạng mục 1 (Bắt buộc): Tự động khóa món "Hết hàng" Realtime khi nguyên liệu BOM về `0`
1. **Backend (`backend/src/modules/inventory/inventory.service.ts` & `events.gateway.ts`)**:
   - Sau khi trừ kho BOM thành công (trong cả `deductInventoryForOrderItem` và `deductInventoryForOrderItems`), với mỗi nguyên liệu có `remainingStock <= 0` (hoặc không đủ định lượng `amountNeeded` cho ít nhất 1 suất của các `Recipe` liên quan):
     - Tìm tất cả `Product` có công thức `Recipe` sử dụng nguyên liệu đó mà `currentStock < recipe.amountNeeded`.
     - Tự động cập nhật `product.isAvailable = false` trong PostgreSQL.
     - Phát sự kiện Socket.io mới: `menu:availability_updated` tới `branch_${branchId}` và tất cả các phòng `table_*` (kèm `{ productId, isAvailable: false, reason: 'Hết nguyên liệu ...' }`).
   - Ghi log nổi bật ra Terminal: `🚫 [AUTO-LOCK] Nguyên liệu "Cá hồi Na Uy" về 0g -> Tự động khóa món "Salad Cá Hồi Nauy" (Hết hàng)`.
   - Khi Admin bấm **+ Nhập Kho (`restock`)**: kiểm tra các món đang `isAvailable = false` dùng nguyên liệu vừa nhập; nếu tất cả nguyên liệu trong BOM đều đủ cho ≥ 1 suất → tự mở khóa `isAvailable = true` và phát `menu:availability_updated`.
2. **Frontend (`frontend/src/lib/live-store.ts` & `frontend/src/app/table/[id]/page.tsx`)**:
   - Lắng nghe socket `menu:availability_updated` trong `live-store.ts` → cập nhật `isAvailable` của `menuItems` ngay lập tức (0ms, không cần reload).
   - Tại `/table/[id]/page.tsx`: **không ẩn món hết hàng** (`isAvailable === false`). Thay vào đó, giữ nguyên thẻ món trên E-Menu nhưng làm mờ (`opacity-60 grayscale`), gắn badge đỏ nổi bật **"HẾT HÀNG"**, vô hiệu hóa nút bấm thêm món (`disabled`).

### Hạng mục 2 (Bắt buộc): Bổ sung nghiệp vụ Tách bàn (Split Table) & Realtime POS
1. **Backend (`backend/src/modules/tables/`)**:
   - Tạo DTO `split-table.dto.ts`: `{ fromTableId: string; toTableId: string; orderItemIds: string[] }`.
   - Thêm endpoint `POST /api/tables/split` (`@Roles(Role.ADMIN, Role.MANAGER, Role.CASHIER)`).
   - Logic `splitTable` trong 1 Transaction ACID:
     - Kiểm tra `fromTable` có phiên ăn mở, `toTable` đang `AVAILABLE` (hoặc mở sẵn phiên nếu cần), và toàn bộ `orderItemIds` thuộc phiên ăn của `fromTable`.
     - Tạo `OrderSession` mới (và 1 `Order` mới với mã `ORD-SPLIT-...`) cho `toTable`.
     - Chuyển các `OrderItem` được chọn sang `Order` mới của `toTable`.
     - Cập nhật trạng thái `toTable` thành `OCCUPIED`. Nếu `fromTable` không còn món nào → đóng session cũ và chuyển `fromTable` về `AVAILABLE`.
     - Phát `eventsGateway.emitTableUpdated(...)` cho cả `fromTable` và `toTable` (bổ sung tương tự cho `mergeTable` và `transferTable`).
2. **Frontend (`frontend/src/lib/live-store.ts` & `frontend/src/app/pos/page.tsx`)**:
   - Thêm action `splitTable(fromTableId, toTableId, orderItemIds)` gọi `POST /api/tables/split`.
   - Tại `/pos/page.tsx`: Bổ sung nút **"Tách Bàn"** cạnh nút Đổi/Gộp bàn. Mở modal cho phép Thu ngân tick chọn từng món cần tách từ bàn hiện tại + chọn bàn đích trống → bấm **Xác Nhận Tách Bàn**.

### Hạng mục 3 (Bắt buộc): Chuẩn bị dữ liệu Demo chạm ngưỡng `0`
- Cập nhật `seed.ts` (hoặc tạo script `npm run seed:demo`) với kịch bản chuẩn:
  - Nguyên liệu **`Cá hồi Na Uy phi lê tươi` (`ing-9`)** tại `branch-1` đặt sẵn tồn kho = **`80g`** (đúng bằng định lượng 1 suất *Salad Cá Hồi Nauy Sốt Chanh Dây* `menu-4`) hoặc **`130g`** (nếu demo đặt kèm Topping *Thêm 50g cá hồi phi lê* `top-salmon`).
  - Toàn bộ bàn `T-01` → `T-12` ở trạng thái **`AVAILABLE`** (trống sạch sẽ).

### Hạng mục 4 (Khuyến nghị - Nâng chất lượng bảo vệ)
- **VietQR quét thật**: Thay khung mô phỏng trong `frontend/src/components/vietqr-modal.tsx` bằng ảnh QR chuẩn Napas 24/7:
  `https://img.vietqr.io/image/MB-098877665544-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountHolder)}`
  (có fallback nếu mất internet).
- **Xác minh truyền Topping (`modifierIds`)**: Kiểm tra hàm `placeOrder` trong `frontend/src/lib/live-store.ts` đảm bảo gửi đúng `modifierIds` xuống API để Backend ghi nhận giá Topping, hiển thị Topping trên KDS và trừ kho BOM của cả Topping.

---

## ⚙️ 4. Quy Trình Chuẩn Bị TRƯỚC KHI LÊN BỤC (Pre-Defense Checklist)

Thực hiện toàn bộ các bước sau **trước khi bắt đầu bấm giờ**:

### 4.1. Khởi chạy hệ thống & Reset dữ liệu sạch
Mở **3 cửa sổ Terminal** (PowerShell / CMD):

- **Terminal 1 – Backend API & Log Realtime (GIỮ MỞ ĐỂ CHIẾU LOG):**
  ```powershell
  cd "c:\ĐỒ ÁN\smart-restaurant-pos-kds\backend"
  npx prisma db seed
  npm run start:dev
  ```
  *Kiểm tra:* Thấy log `Application is running on: http://localhost:4000` và sẵn sàng in log Socket.io + BOM.

- **Terminal 2 – Frontend Next.js:**
  ```powershell
  cd "c:\ĐỒ ÁN\smart-restaurant-pos-kds\frontend"
  npm run dev
  ```
  *Kiểm tra:* Truy cập được `http://localhost:3000`.

- **Terminal 3 – Database Viewer (CSDL):**
  ```powershell
  cd "c:\ĐỒ ÁN\smart-restaurant-pos-kds\backend"
  npx prisma studio
  ```
  *Hoặc mở trực tiếp Supabase Table Editor trên trình duyệt.* Mở sẵn 3 bảng quan trọng:
  1. `inventories` (lọc theo `branchId = branch-1`, chú ý dòng **Cá hồi Na Uy phi lê tươi = 80g / 130g**).
  2. `inventory_audit_logs` (sắp xếp `createdAt DESC`).
  3. `products` (chú ý cột `isAvailable` của *Salad Cá Hồi Nauy*).

### 4.2. Bố cục Chia 3 Màn Hình & Mở Tab theo Actor

> [!WARNING]
> **Lưu ý cực quan trọng về phiên đăng nhập (Auth Session):**
> Ứng dụng lưu JWT/Role trong `localStorage` của `http://localhost:3000`. Nếu mở `/kds`, `/pos`, `/admin` trong **cùng 1 Chrome Profile**, đăng nhập tài khoản sau sẽ ghi đè tài khoản trước!
> **Cách xử lý chuẩn:**
> - **Cửa sổ 1 (Trái – 30% chiều ngang):** Chrome Profile thường (chế độ Mobile responsive hoặc thu hẹp như điện thoại) → **Khách hàng (Guest)** tại `http://localhost:3000/table/T-01` *(không cần đăng nhập)*.
> - **Cửa sổ 2 (Giữa – 35% chiều ngang):** Chrome Profile 2 (hoặc Edge) → Đăng nhập 1-Click vai trò **Đầu Bếp KDS** (`kitchen` / `123456`) → mở `http://localhost:3000/kds`.
>   - 🔔 **BẮT BUỘC:** Click chuột 1 lần vào bất kỳ vị trí nào trên trang `/kds` (hoặc bật/tắt icon Loa góc phải rồi bật lại) để **mở khóa Web Audio API** trên trình duyệt và vặn loa laptop lên ~80%!
> - **Cửa sổ 3 (Phải – 35% chiều ngang):** Chrome Profile 3 (hoặc Cửa sổ Ẩn danh) → Đăng nhập vai trò **Thu Ngân POS** (`cashier` / `123456`) tại Tab 1 (`http://localhost:3000/pos`).
>   - **Tab 2 (Cửa sổ 3 hoặc Profile Admin):** Quản Trị Kho BOM (`http://localhost:3000/admin`, đăng nhập `admin` / `123456`).
>   - **Tab 3:** Prisma Studio (`http://localhost:5555`) mở sẵn bảng `inventories` & `inventory_audit_logs`.
>   - **Cửa sổ Terminal 1 (Backend Log):** Đặt sẵn ở góc dưới hoặc Alt+Tab chuyển nhanh để show log Socket.io & SQL Transaction.

---

## 🎬 5. Kịch Bản Thực Hiện Đúng 3 Bước Trên Bục (11 Phút)

### 🟢 BƯỚC 1: Nghiệp vụ khởi tạo (00:00 – 03:00 | 3 phút)
**Mục tiêu:** Trình diễn bố cục 3 màn hình theo Actor; Khách quét QR tại bàn, chọn món thuộc nhiều trạm bếp, chọn Topping và bấm đặt.

1. **Giới thiệu nhanh 3 màn hình (20 giây):**
   - Chỉ lần lượt: **Trái** = Điện thoại Khách hàng (Bàn T-01) | **Giữa** = Màn hình Bếp KDS (3 trạm) | **Phải** = Quầy Thu ngân POS.
2. **Chứng minh QR tại bàn bảo mật HMAC (30 giây):**
   - Trên màn hình **POS (Phải)**: Click Bàn `T-01` → bấm nút **Mã QR Bàn** để hiện mã QR có chữ ký số HMAC-SHA256 (có thể giơ điện thoại quét thật hoặc mở link QR trên Cửa sổ Trái).
   - *Điểm nhấn:* Giải thích ngắn nếu sửa tay URL hoặc sai chữ ký HMAC, hệ thống chặn ngay màn hình *"Mã QR không hợp lệ"*.
3. **Khách chọn món + Topping trên Cửa sổ Trái (1 phút 40 giây):**
   - **Món 1 (Trạm Bếp Nóng):** Chọn **Ramen Thịt Heo Chashu Đặc Biệt** → Chọn Size **Tô Lớn (+25.000đ)**, Mức cay **Cay vừa**, chọn Topping **Thêm 1 quả trứng lòng đào (+15.000đ)** + **Thêm thịt Chashu (+30.000đ)**, ghi chú *"Ít hành"* → **Thêm Vào Giỏ**.
   - **Món 2 (Trạm Bếp Lạnh – Món kích hoạt hết kho ở Bước 3):** Chọn **Salad Cá Hồi Nauy Sốt Chanh Dây** → Chọn Topping **Thêm 50g cá hồi phi lê (+45.000đ)** *(tổng tốn 80g + 50g = 130g cá hồi, hoặc không chọn topping nếu tồn kho đặt sẵn 80g)* → **Thêm Vào Giỏ**.
   - **Món 3 (Trạm Quầy Pha Chế):** Chọn **Trà Đào Cam Sả Thảo Mộc** → Chọn **70% Đường**, Topping **Thêm 2 miếng đào giòn (+12.000đ)** → **Thêm Vào Giỏ**.
4. **Kiểm tra giỏ hàng (30 giây):**
   - Mở giỏ hàng trên Cửa sổ Trái, chỉ rõ hệ thống tự động cộng giá Topping và tính **VAT 8%**.
   - Chuẩn bị bấm nút **"GỬI ĐƠN VÀO BẾP"** để chuyển mượt sang Bước 2.

---

### 🔵 BƯỚC 2: Luồng xử lý cốt lõi & Realtime (03:00 – 07:00 | 4 phút)
**Mục tiêu:** Chứng minh độ trễ **< 1 giây** qua Socket.io, **nổ chuông**, và **phân luồng đúng trạm chế biến** trên KDS.

1. **Kích hoạt Realtime (30 giây):**
   - Nhắc hội đồng chú ý đồng thời **Màn hình Giữa (KDS)**, **Màn hình Phải (POS)** và **âm thanh loa**.
   - Bấm **"GỬI ĐƠN VÀO BẾP"** ở Cửa sổ Trái.
2. **Quan sát hiệu ứng < 1 giây (1 phút):**
   - 🔔 **Chuông báo âm thanh** trên `/kds` vang lên ngay lập tức.
   - Vé order của **Bàn T-01** hiện ra trên KDS kèm đồng hồ **Urgency Timer** đếm thời gian.
   - Đồng thời trên **POS (Phải)**: Bàn `T-01` tự động đổi màu từ **Trống** → **Đang Có Khách (Xanh dương)** không cần F5.
3. **Chứng minh phân luồng theo đúng trạm chế biến (1 phút 30 giây):**
   - Trên màn hình **KDS (Giữa)**, lần lượt bấm các tab trạm trên thanh header:
     - Click **Bếp Nóng** → Chỉ hiện *Ramen Thịt Heo Chashu* (kèm đầy đủ Size, Mức cay, Topping, Ghi chú).
     - Click **Bếp Lạnh** → Chỉ hiện *Salad Cá Hồi Nauy*.
     - Click **Quầy Pha Chế** → Chỉ hiện *Trà Đào Cam Sả*.
   - Bấm nút **Tổng Hợp Món (Aggregation Mode)** để show khả năng gom số lượng món cùng loại khi quán đông.
   - Quay lại chế độ **Tất Cả Trạm**.
4. **Chứng minh kỹ thuật qua Terminal Log (1 phút):**
   - Mở **Terminal Backend Log** cho hội đồng xem 3 dòng log vừa in ra:
     - `📢 emitOrderPlaced -> Table: tbl-1, Order: ORD-xxx`
     - Các room nhận sự kiện: `pos_branch-1`, `table_tbl-1`, `kitchen_branch-1_hot`, `kitchen_branch-1_cold`, `kitchen_branch-1_bar`.
   - Bếp bấm **"Nấu"** (Cooking) cho món Ramen → chỉ sang **Màn hình Trái (Khách)** thấy trạng thái món lập tức nhảy sang **"Đang nấu"** realtime.

---

### 🔴 BƯỚC 3: Thử lửa Ngoại lệ – BOM tự trừ kho, Khóa "Hết hàng", Tách/Gộp bàn & VietQR (07:00 – 11:00 | 4 phút)
**Mục tiêu:** Chứng minh trọn vẹn 3 bài toán khó nhất của đề tài: Trừ kho BOM chính xác (ACID/Row-Lock), Tự động khóa món hết hàng Realtime, và Nghiệp vụ Thu ngân Tách/Gộp bàn + VietQR.

#### Phần 3A: Bếp Hoàn thành → Kho tự động trừ nguyên liệu theo công thức BOM (1 phút 15 giây)
1. Trước khi bấm Hoàn thành, liếc nhanh **CSDL (`inventories`)** hoặc **Tab `/admin`**: chỉ rõ tồn kho hiện tại của **Cá hồi Na Uy = 80g** (hoặc 130g), **Thịt Heo Chashu = 1800g**, **Trứng gà ta = 65 quả**.
2. Trên **Màn hình Bếp KDS (Giữa)**: Bấm **"Hoàn Tất Toàn Bộ Vé (Trừ Kho BOM)"** (hoặc bấm **Xong** từng món).
3. **Chứng minh kết quả ngay lập tức:**
   - Mở **Tab `/admin` (Kho Nguyên Vật Liệu)** & **CSDL (`inventory_audit_logs`)**:
     - *Thịt Heo Chashu*: trừ đúng `100g` (món chính) + `50g` (Topping) = `150g` → còn `1650g`.
     - *Trứng gà ta*: trừ `1 quả` (món chính) + `1 quả` (Topping) = `2 quả` → còn `63 quả`.
     - *Cá hồi Na Uy*: trừ hết `80g` (hoặc `130g`) → **còn đúng `0g` (Trạng thái Đỏ – Hết hàng)**.
   - Nhấn mạnh kỹ thuật: Hệ thống dùng PostgreSQL Transaction với **`SELECT ... FOR UPDATE` (Row-Level Lock)** và sắp xếp `ingredientId` theo alphabet để **chống trừ âm kho và chống Deadlock** khi nhiều bếp hoàn thành cùng lúc.

#### Phần 3B: Nguyên liệu về `0` → Món trên QR khách tự khóa "Hết hàng" (45 giây)
1. Quay mắt về **Màn hình Trái (Khách hàng `/table/T-01`)**, chuyển sang tab **Thực Đơn (Menu)** (không hề bấm F5!).
2. **Kết quả:** Món **Salad Cá Hồi Nauy Sốt Chanh Dây** đã tự động chuyển sang trạng thái **mờ + gắn nhãn đỏ "HẾT HÀNG"** và bị khóa nút bấm đặt.
3. Mở **CSDL (`products`)**: thấy cột `isAvailable` của `menu-4` đã tự động chuyển sang `false`.
4. *(Điểm cộng nếu còn 15 giây)*: Giải thích thêm nếu cố tình gửi request API đặt món đó bằng Postman/DevTools, Backend cũng chặn cứng bằng lỗi `400 Bad Request`.

#### Phần 3C: Thu ngân Tách/Gộp bàn & Tạo VietQR (2 phút)
1. Trên **Màn hình Trái (Khách)**: Chuyển sang tab **Đơn Món** (đã 100% Hoàn Thành) → bấm **"Yêu Cầu Thanh Toán"**.
2. Trên **Màn hình Phải (POS `/pos`)**:
   - Thanh thông báo nổi màu vàng hiện lên tức thì: *"Bàn T-01 đang cần thanh toán"*, Bàn `T-01` nhấp nháy trạng thái **Chờ Thanh Toán**.
3. **Thao tác Tách bàn (Split Table):**
   - Chọn Bàn `T-01` → bấm **"Tách Bàn"** → tick chọn món *Trà Đào Cam Sả* → chọn bàn đích trống **`T-02`** → bấm **Xác Nhận Tách**.
   - **Kết quả:** Sơ đồ bàn cập nhật ngay: `T-01` còn Ramen & Salad, `T-02` chuyển sang **Đang Có Khách** chứa món *Trà Đào Cam Sả*.
4. **Thao tác Gộp bàn (Merge Table):**
   - Chọn Bàn `T-02` → bấm **"Gộp Bàn"** → chọn bàn đích **`T-01`** → bấm **Xác Nhận Gộp**.
   - **Kết quả:** Toàn bộ món gộp trở lại về `T-01` thành 1 hóa đơn duy nhất; `T-02` tự giải phóng về **Bàn Trống**.
5. **Tạo VietQR & Chốt Thanh Toán:**
   - Chọn Bàn `T-01` → bấm **"VietQR Động"**.
   - Modal hiển thị mã **VietQR chuẩn Napas 24/7** kèm đúng **Tổng tiền (đã gồm VAT 8%)** và **Nội dung chuyển khoản** theo mã đơn (`THANHTOAN ORD-xxx T-01`).
   - Bấm **"Xác Nhận Đã Nhận Tiền"** → Bàn `T-01` giải phóng về **Bàn Trống**, hóa đơn được lưu vào bảng `invoices` trong CSDL.

---

## 🛡️ 6. Phương Án Dự Phòng Sự Cố & Câu Hỏi Hội Đồng Hay Hỏi

### 6.1. Xử lý nhanh sự cố trên bục
| Tình huống | Nguyên nhân | Cách xử lý trong 5 giây |
| :--- | :--- | :--- |
| Chuông KDS không kêu | Chrome chặn Autoplay vì chưa có tương tác chuột trên tab `/kds`. | Click vào nút biểu tượng Loa trên góc phải `/kds` trước khi demo Bước 2. |
| Tab `/pos` hoặc `/kds` bị đá về `/login` hoặc báo 403 | Mở chung 1 Chrome Profile làm ghi đè `localStorage`. | Dùng đúng 3 Profile/Trình duyệt tách biệt (hoặc dùng tài khoản `admin` nếu bất khả kháng). |
| Dữ liệu bị lỗi sau khi chạy thử trước giờ G | Tồn kho đã bị trừ về 0 hoặc bàn đang kẹt session cũ. | Chạy lại đúng 1 lệnh: `npx prisma db seed` ở thư mục `backend` (mất ~5 giây). |
| Mạng WiFi trường chập chờn không tải được ảnh VietQR | Chặn hoặc chậm kết nối tới `img.vietqr.io`. | Modal VietQR tự động fallback về khung QR dự phòng + vẫn hiển thị đủ STK, số tiền, nội dung chuyển khoản. |

### 6.2. Các câu hỏi bảo vệ trọng tâm (Chuẩn bị sẵn câu trả lời ngắn)
1. **"Làm sao đảm bảo 2 đầu bếp bấm Hoàn thành cùng lúc không bị trừ âm kho?"**
   - Trả lời: Trong `InventoryService`, hệ thống bọc toàn bộ thao tác trong `prisma.$transaction`, khóa dòng dữ liệu bằng câu lệnh SQL `SELECT ... FROM inventories WHERE ... FOR UPDATE` (Row-Level Locking) và **sắp xếp `ingredientId` theo thứ tự tăng dần** để tránh Deadlock. Nếu `currentStock < amountNeeded`, Transaction sẽ rollback ngay lập tức.
2. **"Làm sao chống khách ngồi ở nhà quét lại QR cũ hoặc sửa URL để phá quán?"**
   - Trả lời: Mỗi mã QR bàn được ký bằng **HMAC-SHA256** (`TableTokenService`) với `TABLE_QR_SECRET` phía Backend. Nếu khách tự ý sửa `tableId` trên URL, chữ ký không khớp và trang `/table/[id]` sẽ khóa truy cập.
3. **"Tại sao độ trễ KDS đạt dưới 1 giây?"**
   - Trả lời: Sử dụng **Socket.io WebSocket** hai chiều phân phòng chi tiết (`kitchen_${branchId}_${stationId}`, `pos_${branchId}`, `table_${tableId}`). Khi đơn được tạo, Backend chỉ bắn payload delta tới đúng các phòng liên quan, và Frontend `live-store.ts` cập nhật thẳng in-memory (0ms) không chờ reload toàn bộ trang.
