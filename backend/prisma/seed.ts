import { PrismaClient, Role, TableArea, TableStatus, SessionStatus, OrderItemStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu nạp dữ liệu mẫu (Seeding Database)...');

  // Xóa dữ liệu cũ theo thứ tự ràng buộc khóa ngoại
  console.log('🧹 Dọn dẹp dữ liệu cũ...');
  await prisma.inventoryAuditLog.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItemModifier.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.orderSession.deleteMany();
  await prisma.modifierRecipe.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.itemModifier.deleteMany();
  await prisma.productModifier.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.kitchenStation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.table.deleteMany();
  await prisma.account.deleteMany();
  await prisma.branch.deleteMany();

  // 1. CHI NHÁNH (Branches)
  console.log('🏢 Tạo danh sách chi nhánh...');
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        id: 'branch-1',
        name: 'Chi nhánh 1 - Quận 1 (Flagship)',
        address: '72 Lê Lợi, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
        phoneNumber: '028 3822 9999',
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        id: 'branch-2',
        name: 'Chi nhánh 2 - Cầu Giấy',
        address: '105 Duy Tân, P. Dịch Vọng Hậu, Q. Cầu Giấy, Hà Nội',
        phoneNumber: '024 3795 8888',
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        id: 'branch-3',
        name: 'Chi nhánh 3 - Hải Châu',
        address: '36 Bạch Đằng, P. Thạch Thang, Q. Hải Châu, Đà Nẵng',
        phoneNumber: '0236 388 7777',
        isActive: true,
      },
    }),
  ]);

  // 2. TÀI KHOẢN NHÂN VIÊN & QUẢN LÝ THEO VÙNG (9 tài khoản - 3 chi nhánh x 3 vai trò)
  console.log('👤 Tạo 9 tài khoản nhân viên & quản lý theo vùng...');
  const defaultPassword = await bcrypt.hash('123456', 10);

  await prisma.account.createMany({
    data: [
      // Chi nhánh 1 - TP.HCM
      {
        id: 'acc-admin-hcm',
        username: 'admin_hcm',
        email: 'admin.hcm@smartpos.vn',
        password: defaultPassword,
        fullName: 'Nguyễn Văn Minh (Quản Lý TP.HCM)',
        role: Role.ADMIN,
        branchId: 'branch-1',
      },
      {
        id: 'acc-cashier-hcm',
        username: 'cashier_hcm',
        email: 'cashier.hcm@smartpos.vn',
        password: defaultPassword,
        fullName: 'Trần Thị Thu (Thu Ngân TP.HCM)',
        role: Role.CASHIER,
        branchId: 'branch-1',
      },
      {
        id: 'acc-kitchen-hcm',
        username: 'kitchen_hcm',
        email: 'kitchen.hcm@smartpos.vn',
        password: defaultPassword,
        fullName: 'Đội Ngũ Bếp TP.HCM',
        role: Role.COOK,
        branchId: 'branch-1',
      },
      // Chi nhánh 2 - Hà Nội
      {
        id: 'acc-admin-hn',
        username: 'admin_hn',
        email: 'admin.hn@smartpos.vn',
        password: defaultPassword,
        fullName: 'Phạm Thị Hạnh (Quản Lý Hà Nội)',
        role: Role.ADMIN,
        branchId: 'branch-2',
      },
      {
        id: 'acc-cashier-hn',
        username: 'cashier_hn',
        email: 'cashier.hn@smartpos.vn',
        password: defaultPassword,
        fullName: 'Lê Minh Tuấn (Thu Ngân Hà Nội)',
        role: Role.CASHIER,
        branchId: 'branch-2',
      },
      {
        id: 'acc-kitchen-hn',
        username: 'kitchen_hn',
        email: 'kitchen.hn@smartpos.vn',
        password: defaultPassword,
        fullName: 'Đội Ngũ Bếp Hà Nội',
        role: Role.COOK,
        branchId: 'branch-2',
      },
      // Chi nhánh 3 - Đà Nẵng
      {
        id: 'acc-admin-dn',
        username: 'admin_dn',
        email: 'admin.dn@smartpos.vn',
        password: defaultPassword,
        fullName: 'Nguyễn Thị Lan (Quản Lý Đà Nẵng)',
        role: Role.ADMIN,
        branchId: 'branch-3',
      },
      {
        id: 'acc-cashier-dn',
        username: 'cashier_dn',
        email: 'cashier.dn@smartpos.vn',
        password: defaultPassword,
        fullName: 'Trần Quốc Huy (Thu Ngân Đà Nẵng)',
        role: Role.CASHIER,
        branchId: 'branch-3',
      },
      {
        id: 'acc-kitchen-dn',
        username: 'kitchen_dn',
        email: 'kitchen.dn@smartpos.vn',
        password: defaultPassword,
        fullName: 'Đội Ngũ Bếp Đà Nẵng',
        role: Role.COOK,
        branchId: 'branch-3',
      },
    ],
  });

  // 3. TRẠM BẾP (Kitchen Stations)
  console.log('🍳 Tạo trạm bếp KDS...');
  await prisma.kitchenStation.createMany({
    data: [
      {
        id: 'hot',
        name: 'Bếp Nóng',
        description: 'Ramen, Mì, Cơm, Món xào, Món nướng',
        color: 'amber',
        iconName: 'Flame',
      },
      {
        id: 'cold',
        name: 'Bếp Lạnh',
        description: 'Salad, Sushi, Gỏi cuốn, Khai vị lạnh',
        color: 'emerald',
        iconName: 'Salad',
      },
      {
        id: 'bar',
        name: 'Quầy Pha Chế',
        description: 'Cà phê, Trà sữa, Nước ép, Mocktail',
        color: 'sky',
        iconName: 'Coffee',
      },
    ],
  });

  // 4. BÀN ĂN (Tables)
  console.log('🪑 Tạo sơ đồ bàn ăn...');
  const tableData = [
    // Chi nhánh 1 (12 bàn)
    { id: 'tbl-1', branchId: 'branch-1', tableNumber: 'T-01', displayName: 'Bàn 01', capacity: 4, area: TableArea.GROUND },
    { id: 'tbl-2', branchId: 'branch-1', tableNumber: 'T-02', displayName: 'Bàn 02', capacity: 2, area: TableArea.GROUND },
    { id: 'tbl-3', branchId: 'branch-1', tableNumber: 'T-03', displayName: 'Bàn 03', capacity: 6, area: TableArea.GROUND },
    { id: 'tbl-4', branchId: 'branch-1', tableNumber: 'T-04', displayName: 'Bàn 04', capacity: 4, area: TableArea.GROUND },
    { id: 'tbl-5', branchId: 'branch-1', tableNumber: 'T-05', displayName: 'Bàn 05', capacity: 4, area: TableArea.GROUND },
    { id: 'tbl-6', branchId: 'branch-1', tableNumber: 'T-06', displayName: 'Bàn 06', capacity: 8, area: TableArea.FLOOR2 },
    { id: 'tbl-7', branchId: 'branch-1', tableNumber: 'T-07', displayName: 'Bàn 07', capacity: 4, area: TableArea.FLOOR2 },
    { id: 'tbl-8', branchId: 'branch-1', tableNumber: 'T-08', displayName: 'Bàn 08', capacity: 4, area: TableArea.FLOOR2 },
    { id: 'tbl-9', branchId: 'branch-1', tableNumber: 'T-09', displayName: 'Bàn 09', capacity: 10, area: TableArea.FLOOR2 },
    { id: 'tbl-10', branchId: 'branch-1', tableNumber: 'T-10', displayName: 'Bàn 10', capacity: 4, area: TableArea.OUTDOOR },
    { id: 'tbl-11', branchId: 'branch-1', tableNumber: 'T-11', displayName: 'Bàn 11', capacity: 6, area: TableArea.OUTDOOR },
    { id: 'tbl-12', branchId: 'branch-1', tableNumber: 'T-12', displayName: 'Bàn 12', capacity: 2, area: TableArea.OUTDOOR },

    // Chi nhánh 2 (10 bàn)
    { id: 'tbl-13', branchId: 'branch-2', tableNumber: 'T-01', displayName: 'Bàn 01', capacity: 4, area: TableArea.GROUND },
    { id: 'tbl-14', branchId: 'branch-2', tableNumber: 'T-02', displayName: 'Bàn 02', capacity: 2, area: TableArea.GROUND },
    { id: 'tbl-15', branchId: 'branch-2', tableNumber: 'T-03', displayName: 'Bàn 03', capacity: 4, area: TableArea.GROUND },
    { id: 'tbl-16', branchId: 'branch-2', tableNumber: 'T-04', displayName: 'Bàn 04', capacity: 4, area: TableArea.GROUND },
    { id: 'tbl-17', branchId: 'branch-2', tableNumber: 'T-05', displayName: 'Bàn 05', capacity: 6, area: TableArea.GROUND },
    { id: 'tbl-18', branchId: 'branch-2', tableNumber: 'T-06', displayName: 'Bàn 06', capacity: 8, area: TableArea.FLOOR2 },
    { id: 'tbl-19', branchId: 'branch-2', tableNumber: 'T-07', displayName: 'Bàn 07', capacity: 4, area: TableArea.FLOOR2 },
    { id: 'tbl-20', branchId: 'branch-2', tableNumber: 'T-08', displayName: 'Bàn 08', capacity: 4, area: TableArea.FLOOR2 },
    { id: 'tbl-21', branchId: 'branch-2', tableNumber: 'T-09', displayName: 'Bàn 09', capacity: 4, area: TableArea.OUTDOOR },
    { id: 'tbl-22', branchId: 'branch-2', tableNumber: 'T-10', displayName: 'Bàn 10', capacity: 6, area: TableArea.OUTDOOR },

    // Chi nhánh 3 (8 bàn)
    { id: 'tbl-23', branchId: 'branch-3', tableNumber: 'T-01', displayName: 'Bàn 01', capacity: 4, area: TableArea.GROUND },
    { id: 'tbl-24', branchId: 'branch-3', tableNumber: 'T-02', displayName: 'Bàn 02', capacity: 2, area: TableArea.GROUND },
    { id: 'tbl-25', branchId: 'branch-3', tableNumber: 'T-03', displayName: 'Bàn 03', capacity: 4, area: TableArea.GROUND },
    { id: 'tbl-26', branchId: 'branch-3', tableNumber: 'T-04', displayName: 'Bàn 04', capacity: 6, area: TableArea.GROUND },
    { id: 'tbl-27', branchId: 'branch-3', tableNumber: 'T-05', displayName: 'Bàn 05', capacity: 8, area: TableArea.FLOOR2 },
    { id: 'tbl-28', branchId: 'branch-3', tableNumber: 'T-06', displayName: 'Bàn 06', capacity: 4, area: TableArea.FLOOR2 },
    { id: 'tbl-29', branchId: 'branch-3', tableNumber: 'T-07', displayName: 'Bàn 07', capacity: 4, area: TableArea.OUTDOOR },
    { id: 'tbl-30', branchId: 'branch-3', tableNumber: 'T-08', displayName: 'Bàn 08', capacity: 6, area: TableArea.OUTDOOR },
  ];

  await prisma.table.createMany({
    data: tableData.map((t) => ({
      ...t,
      status: TableStatus.AVAILABLE,
    })),
  });

  // 5. DANH MỤC MÓN ĂN (Categories)
  console.log('📂 Tạo danh mục thực đơn...');
  await prisma.category.createMany({
    data: [
      { id: 'cat-noodles', name: 'Món Mì & Phở', displayOrder: 1 },
      { id: 'cat-rice', name: 'Cơm & Món Nóng', displayOrder: 2 },
      { id: 'cat-salad', name: 'Salad & Khai Vị', displayOrder: 3 },
      { id: 'cat-drinks', name: 'Thức Uống', displayOrder: 4 },
      { id: 'cat-dessert', name: 'Tráng Miệng', displayOrder: 5 },
    ],
  });

  // 6. NGUYÊN LIỆU KHO (Ingredients) & TỒN KHO CHI NHÁNH (Inventories)
  console.log('🥩 Tạo danh mục nguyên vật liệu & Tồn kho chi nhánh...');
  const ingredientData = [
    { id: 'ing-1', name: 'Mì Ramen tươi thủ công', baseUnit: 'g', stock: 2400, min: 1000, price: 45, sup: 'Nhà cung cấp Mì Nhật Bản Asahi' },
    { id: 'ing-2', name: 'Thịt Heo Chashu ủ vị', baseUnit: 'g', stock: 1800, min: 1200, price: 180, sup: 'CP Food Fresh Meat' },
    { id: 'ing-3', name: 'Nước dùng Tonkotsu xương hầm', baseUnit: 'ml', stock: 5500, min: 2500, price: 35, sup: 'Bếp trung tâm chi nhánh 1' },
    { id: 'ing-4', name: 'Bánh phở tươi Hà Nội', baseUnit: 'g', stock: 3200, min: 1500, price: 30, sup: 'Lò bánh phở truyền thống Ba Đình' },
    { id: 'ing-5', name: 'Nạm & Bắp Bò Úc tươi', baseUnit: 'g', stock: 900, min: 1000, price: 260, sup: 'MeatDeli Premium Beef' }, // Cảnh báo vàng tồn kho
    { id: 'ing-6', name: 'Nước dùng phở bò truyền thống', baseUnit: 'ml', stock: 6000, min: 2000, price: 40, sup: 'Bếp hầm xương 24h' },
    { id: 'ing-7', name: 'Tôm sú tươi lột vỏ', baseUnit: 'g', stock: 1200, min: 600, price: 220, sup: 'Hải sản Cần Giờ' },
    { id: 'ing-8', name: 'Cơm thơm ST25 dẻo', baseUnit: 'g', stock: 4500, min: 1500, price: 25, sup: 'Gạo ST25 Sóc Trăng' },
    { id: 'ing-9', name: 'Cá hồi Na Uy phi lê tươi', baseUnit: 'g', stock: 130, min: 500, price: 420, sup: 'Salmar Seafood Norway' }, // 130g = vừa đủ 1 suất Salad (80g) + 1 Topping cá hồi (50g) -> Về 0 để demo khóa Hết hàng!
    { id: 'ing-10', name: 'Rau xà lách Romaine sạch', baseUnit: 'g', stock: 1800, min: 800, price: 50, sup: 'Đà Lạt Gap Farm' },
    { id: 'ing-11', name: 'Sốt chanh dây đặc chế', baseUnit: 'ml', stock: 950, min: 400, price: 70, sup: 'Bếp lạnh chi nhánh 1' },
    { id: 'ing-12', name: 'Cà phê Robusta Đắk Lắk hảo hạng', baseUnit: 'g', stock: 3000, min: 1000, price: 120, sup: 'Nông trại Buôn Ma Thuột' },
    { id: 'ing-13', name: 'Kem béo muối biển đặc biệt', baseUnit: 'ml', stock: 1500, min: 500, price: 85, sup: 'Anchor Dairy New Zealand' },
    { id: 'ing-14', name: 'Trà túi lọc thảo mộc hương đào', baseUnit: 'túi', stock: 120, min: 40, price: 3500, sup: 'Phúc Long Tea Co.' },
    { id: 'ing-15', name: 'Đào ngâm giòn Nam Phi', baseUnit: 'miếng', stock: 95, min: 30, price: 4000, sup: 'Kronos Food' },
    { id: 'ing-16', name: 'Bột Matcha Uji Kyoto chuẩn Nhật', baseUnit: 'g', stock: 350, min: 200, price: 650, sup: 'Kyoto Tea Direct' },
    { id: 'ing-17', name: 'Sữa tươi tiệt trùng nguyên kem', baseUnit: 'ml', stock: 4800, min: 2000, price: 35, sup: 'TH True Milk' },
    { id: 'ing-18', name: 'Trứng gà ta thảo mộc', baseUnit: 'quả', stock: 65, min: 30, price: 4500, sup: 'Ba Huân Farm' },
  ];

  for (const item of ingredientData) {
    await prisma.ingredient.create({
      data: {
        id: item.id,
        name: item.name,
        baseUnit: item.baseUnit,
      },
    });

    // Tạo tồn kho cho cả 3 chi nhánh
    for (const b of branches) {
      await prisma.inventory.create({
        data: {
          branchId: b.id,
          ingredientId: item.id,
          currentStock: b.id === 'branch-1' ? item.stock : Math.round(item.stock * 0.8),
          minSafetyStock: item.min,
          costPrice: item.price,
          supplier: item.sup,
          lastRestockedAt: new Date(),
        },
      });
    }
  }

  // 7. MÓN ĂN (Products) & CÔNG THỨC ĐỊNH LƯỢNG BOM (Recipes)
  console.log('🍜 Tạo thực đơn món ăn & công thức BOM...');
  const menuList = [
    {
      id: 'menu-1',
      name: 'Ramen Thịt Heo Chashu Đặc Biệt',
      categoryId: 'cat-noodles',
      kitchenStationId: 'hot',
      price: 89000,
      description: 'Sợi mì tươi thủ công, thịt heo Chashu mềm tan, trứng lòng đào ngâm tương và nước dùng Tonkotsu hầm 12h.',
      pictureLink: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
      standardPrepMinutes: 10,
      bom: [
        { ingredientId: 'ing-1', quantity: 150 },
        { ingredientId: 'ing-2', quantity: 100 },
        { ingredientId: 'ing-3', quantity: 300 },
        { ingredientId: 'ing-18', quantity: 1 },
      ],
    },
    {
      id: 'menu-2',
      name: 'Phở Bò Tái Nạm Hà Nội',
      categoryId: 'cat-noodles',
      kitchenStationId: 'hot',
      price: 75000,
      description: 'Bánh phở tươi mềm mướt, bắp bò tái nạm ngọt đậm vị trong nước dùng ninh xương ống quế hồi gừng thơm lừng.',
      pictureLink: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80',
      standardPrepMinutes: 8,
      bom: [
        { ingredientId: 'ing-4', quantity: 200 },
        { ingredientId: 'ing-5', quantity: 150 },
        { ingredientId: 'ing-6', quantity: 350 },
      ],
    },
    {
      id: 'menu-3',
      name: 'Cơm Rang Hải Sản Hoàng Kim',
      categoryId: 'cat-rice',
      kitchenStationId: 'hot',
      price: 85000,
      description: 'Hạt cơm ST25 vàng ươm óng ả bọc trứng gà ta, hòa quyện cùng tôm sú giòn sần sật và mực tươi xào lửa lớn.',
      pictureLink: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
      standardPrepMinutes: 12,
      bom: [
        { ingredientId: 'ing-8', quantity: 180 },
        { ingredientId: 'ing-7', quantity: 60 },
        { ingredientId: 'ing-18', quantity: 1 },
      ],
    },
    {
      id: 'menu-4',
      name: 'Salad Cá Hồi Nauy Sốt Chanh Dây',
      categoryId: 'cat-salad',
      kitchenStationId: 'cold',
      price: 115000,
      description: 'Cá hồi Na Uy tươi béo ngậy áp nhẹ bề mặt, kết hợp cùng xà lách Romaine giòn ngọt và sốt chanh dây thanh mát.',
      pictureLink: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
      standardPrepMinutes: 7,
      bom: [
        { ingredientId: 'ing-9', quantity: 80 },
        { ingredientId: 'ing-10', quantity: 120 },
        { ingredientId: 'ing-11', quantity: 40 },
      ],
    },
    {
      id: 'menu-5',
      name: 'Gỏi Cuốn Tôm Thịt Hoàng Gia (4 cuốn)',
      categoryId: 'cat-salad',
      kitchenStationId: 'cold',
      price: 65000,
      description: 'Tôm sú đỏ au, thịt ba chỉ luộc giòn bì, bún tươi và rau húng lủi cuộn bánh tráng phơi sương chấm tương bơ đậu phộng.',
      pictureLink: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&auto=format&fit=crop&q=80',
      standardPrepMinutes: 6,
      bom: [
        { ingredientId: 'ing-7', quantity: 60 },
        { ingredientId: 'ing-10', quantity: 50 },
      ],
    },
    {
      id: 'menu-6',
      name: 'Trà Đào Cam Sả Thảo Mộc',
      categoryId: 'cat-drinks',
      kitchenStationId: 'bar',
      price: 49000,
      description: 'Hương trà thanh khiết quyện cùng tinh chất cam sả sảng khoái và những miếng đào ngâm Nam Phi giòn ngọt rộn rã.',
      pictureLink: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
      standardPrepMinutes: 5,
      bom: [
        { ingredientId: 'ing-14', quantity: 1 },
        { ingredientId: 'ing-15', quantity: 3 },
      ],
    },
    {
      id: 'menu-7',
      name: 'Cà Phê Muối Kem Béo Đắk Lắk',
      categoryId: 'cat-drinks',
      kitchenStationId: 'bar',
      price: 45000,
      description: 'Cốt cà phê phin đậm đặc thơm nồng đặc trưng Tây Nguyên phủ lớp kem béo mặn nhẹ mịn màng gây xao xuyến.',
      pictureLink: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
      standardPrepMinutes: 4,
      bom: [
        { ingredientId: 'ing-12', quantity: 35 },
        { ingredientId: 'ing-13', quantity: 40 },
      ],
    },
    {
      id: 'menu-8',
      name: 'Matcha Latte Sữa Tươi Uji Kyoto',
      categoryId: 'cat-drinks',
      kitchenStationId: 'bar',
      price: 55000,
      description: 'Bột Matcha nguyên chất nhập khẩu từ Uji Kyoto thơm dịu ngát kết hợp sữa tươi thanh trùng ngọt thanh tự nhiên.',
      pictureLink: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
      standardPrepMinutes: 5,
      bom: [
        { ingredientId: 'ing-16', quantity: 15 },
        { ingredientId: 'ing-17', quantity: 120 },
      ],
    },
  ];

  for (const item of menuList) {
    const prod = await prisma.product.create({
      data: {
        id: item.id,
        name: item.name,
        categoryId: item.categoryId,
        kitchenStationId: item.kitchenStationId,
        price: item.price,
        description: item.description,
        pictureLink: item.pictureLink,
        standardPrepMinutes: item.standardPrepMinutes,
      },
    });

    // Tạo công thức BOM
    for (const b of item.bom) {
      await prisma.recipe.create({
        data: {
          productId: prod.id,
          ingredientId: b.ingredientId,
          amountNeeded: b.quantity,
        },
      });
    }
  }

  // 8. TÙY CHỌN & TOPPING (Modifier Groups & Items & Modifier Recipe BOM)
  console.log('✨ Tạo các nhóm tùy chọn (Size, Độ cay, Topping) & BOM Topping...');

  // Nhóm Kích Cỡ Mì Ramen
  const ramenSizeGroup = await prisma.modifierGroup.create({
    data: {
      name: 'Kích cỡ tô',
      isRequired: true,
      isMultiple: false,
      items: {
        create: [
          { name: 'Tiêu chuẩn', extraPrice: 0 },
          { name: 'Tô Lớn (Thêm mì & thịt)', extraPrice: 25000 },
        ],
      },
      productModifiers: {
        create: [{ productId: 'menu-1' }],
      },
    },
  });

  // Nhóm Mức Cay
  await prisma.modifierGroup.create({
    data: {
      name: 'Mức cay',
      isRequired: false,
      isMultiple: false,
      items: {
        create: [
          { name: 'Không cay', extraPrice: 0 },
          { name: 'Cay vừa', extraPrice: 0 },
          { name: 'Cay nồng (Cấp độ 3)', extraPrice: 0 },
        ],
      },
      productModifiers: {
        create: [{ productId: 'menu-1' }, { productId: 'menu-2' }, { productId: 'menu-3' }],
      },
    },
  });

  // Nhóm Topping Ramen (Có trừ kho BOM cho từng Topping!)
  const toppingGroup = await prisma.modifierGroup.create({
    data: {
      name: 'Topping thêm',
      isRequired: false,
      isMultiple: true,
      items: {
        create: [
          { id: 'top-egg', name: 'Thêm 1 quả trứng lòng đào', extraPrice: 15000 },
          { id: 'top-chashu', name: 'Thêm thịt Chashu (2 miếng)', extraPrice: 30000 },
        ],
      },
      productModifiers: {
        create: [{ productId: 'menu-1' }],
      },
    },
  });

  // Định lượng BOM cho Topping trứng lòng đào (1 quả trứng) và thịt Chashu (50g thịt)
  await prisma.modifierRecipe.createMany({
    data: [
      {
        itemModifierId: 'top-egg',
        ingredientId: 'ing-18', // Trứng gà ta
        amountNeeded: 1,
      },
      {
        itemModifierId: 'top-chashu',
        ingredientId: 'ing-2', // Thịt heo chashu
        amountNeeded: 50,
      },
    ],
  });

  // Nhóm Topping Salad (Thêm 50g cá hồi phi lê)
  const saladToppingGroup = await prisma.modifierGroup.create({
    data: {
      name: 'Topping Salad',
      isRequired: false,
      isMultiple: true,
      items: {
        create: [
          { id: 'top-salmon', name: 'Thêm 50g cá hồi phi lê', extraPrice: 45000 },
        ],
      },
      productModifiers: {
        create: [{ productId: 'menu-4' }],
      },
    },
  });

  await prisma.modifierRecipe.create({
    data: {
      itemModifierId: 'top-salmon',
      ingredientId: 'ing-9', // Cá hồi Na Uy
      amountNeeded: 50,
    },
  });

  // Nhóm Lượng Đường & Topping Đào cho Thức Uống
  await prisma.modifierGroup.create({
    data: {
      name: 'Lượng đường',
      isRequired: false,
      isMultiple: false,
      items: {
        create: [
          { name: '100% Đường', extraPrice: 0 },
          { name: '70% Đường', extraPrice: 0 },
          { name: '50% Đường (Ít ngọt)', extraPrice: 0 },
        ],
      },
      productModifiers: {
        create: [{ productId: 'menu-6' }],
      },
    },
  });

  const drinkToppingGroup = await prisma.modifierGroup.create({
    data: {
      name: 'Topping nước uống',
      isRequired: false,
      isMultiple: true,
      items: {
        create: [
          { id: 'top-peach', name: 'Thêm 2 miếng đào giòn', extraPrice: 12000 },
        ],
      },
      productModifiers: {
        create: [{ productId: 'menu-6' }],
      },
    },
  });

  await prisma.modifierRecipe.create({
    data: {
      itemModifierId: 'top-peach',
      ingredientId: 'ing-15', // Đào ngâm giòn
      amountNeeded: 2,
    },
  });

  // 9. DỮ LIỆU BÁN HÀNG, HÓA ĐƠN & NHẬT KÝ TRỪ KHO MẪU (Cho trang Thống kê giàu dữ liệu)
  console.log('📊 Tạo dữ liệu hóa đơn bán hàng & nhật ký trừ kho mẫu cho 3 chi nhánh...');

  const productMeta = new Map(
    menuList.map((m) => [
      m.id,
      {
        price: m.price,
        stationId: m.kitchenStationId,
        bom: m.bom,
      },
    ]),
  );

  const ingredientStockMap = new Map(
    ingredientData.map((i) => [i.id, i.stock]),
  );

  type SeedSaleSpec = {
    branchId: string;
    tableId: string;
    cashierId: string;
    daysAgo: number;
    hoursAgo: number;
    guestCount: number;
    paymentMethod: PaymentMethod;
    discountPercent?: number;
    items: Array<{ productId: string; quantity: number }>;
  };

  const sampleSales: SeedSaleSpec[] = [
    // === CHI NHÁNH 1: TP.HCM (12 hóa đơn: 7 hôm nay + 5 trong 4 ngày qua) ===
    {
      branchId: 'branch-1', tableId: 'tbl-1', cashierId: 'acc-cashier-hcm', daysAgo: 0, hoursAgo: 1, guestCount: 4, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-1', quantity: 2 }, { productId: 'menu-4', quantity: 1 }, { productId: 'menu-6', quantity: 3 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-2', cashierId: 'acc-cashier-hcm', daysAgo: 0, hoursAgo: 2, guestCount: 2, paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'menu-2', quantity: 2 }, { productId: 'menu-7', quantity: 2 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-3', cashierId: 'acc-cashier-hcm', daysAgo: 0, hoursAgo: 3, guestCount: 6, paymentMethod: PaymentMethod.CARD, discountPercent: 5,
      items: [{ productId: 'menu-1', quantity: 3 }, { productId: 'menu-3', quantity: 2 }, { productId: 'menu-5', quantity: 2 }, { productId: 'menu-8', quantity: 4 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-4', cashierId: 'acc-cashier-hcm', daysAgo: 0, hoursAgo: 4, guestCount: 3, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-3', quantity: 2 }, { productId: 'menu-4', quantity: 1 }, { productId: 'menu-6', quantity: 2 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-5', cashierId: 'acc-cashier-hcm', daysAgo: 0, hoursAgo: 5, guestCount: 4, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-1', quantity: 2 }, { productId: 'menu-2', quantity: 2 }, { productId: 'menu-7', quantity: 3 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-6', cashierId: 'acc-cashier-hcm', daysAgo: 0, hoursAgo: 6, guestCount: 5, paymentMethod: PaymentMethod.CARD,
      items: [{ productId: 'menu-4', quantity: 2 }, { productId: 'menu-5', quantity: 2 }, { productId: 'menu-8', quantity: 3 }, { productId: 'menu-1', quantity: 2 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-7', cashierId: 'acc-cashier-hcm', daysAgo: 0, hoursAgo: 7, guestCount: 2, paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'menu-2', quantity: 1 }, { productId: 'menu-3', quantity: 1 }, { productId: 'menu-6', quantity: 2 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-8', cashierId: 'acc-cashier-hcm', daysAgo: 1, hoursAgo: 2, guestCount: 4, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-1', quantity: 4 }, { productId: 'menu-5', quantity: 2 }, { productId: 'menu-6', quantity: 4 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-9', cashierId: 'acc-cashier-hcm', daysAgo: 1, hoursAgo: 5, guestCount: 6, paymentMethod: PaymentMethod.CARD, discountPercent: 10,
      items: [{ productId: 'menu-1', quantity: 3 }, { productId: 'menu-2', quantity: 3 }, { productId: 'menu-4', quantity: 2 }, { productId: 'menu-8', quantity: 5 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-10', cashierId: 'acc-cashier-hcm', daysAgo: 2, hoursAgo: 3, guestCount: 4, paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'menu-3', quantity: 3 }, { productId: 'menu-5', quantity: 2 }, { productId: 'menu-7', quantity: 3 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-11', cashierId: 'acc-cashier-hcm', daysAgo: 3, hoursAgo: 4, guestCount: 4, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-1', quantity: 2 }, { productId: 'menu-4', quantity: 2 }, { productId: 'menu-8', quantity: 2 }],
    },
    {
      branchId: 'branch-1', tableId: 'tbl-12', cashierId: 'acc-cashier-hcm', daysAgo: 4, hoursAgo: 2, guestCount: 2, paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'menu-2', quantity: 2 }, { productId: 'menu-6', quantity: 2 }],
    },

    // === CHI NHÁNH 2: HÀ NỘI (8 hóa đơn: 5 hôm nay + 3 trong 3 ngày qua) ===
    {
      branchId: 'branch-2', tableId: 'tbl-13', cashierId: 'acc-cashier-hn', daysAgo: 0, hoursAgo: 1, guestCount: 4, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-2', quantity: 3 }, { productId: 'menu-5', quantity: 2 }, { productId: 'menu-7', quantity: 3 }],
    },
    {
      branchId: 'branch-2', tableId: 'tbl-14', cashierId: 'acc-cashier-hn', daysAgo: 0, hoursAgo: 2, guestCount: 2, paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'menu-1', quantity: 2 }, { productId: 'menu-6', quantity: 2 }],
    },
    {
      branchId: 'branch-2', tableId: 'tbl-15', cashierId: 'acc-cashier-hn', daysAgo: 0, hoursAgo: 3, guestCount: 4, paymentMethod: PaymentMethod.CARD,
      items: [{ productId: 'menu-3', quantity: 2 }, { productId: 'menu-4', quantity: 2 }, { productId: 'menu-8', quantity: 2 }],
    },
    {
      branchId: 'branch-2', tableId: 'tbl-16', cashierId: 'acc-cashier-hn', daysAgo: 0, hoursAgo: 5, guestCount: 3, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-2', quantity: 2 }, { productId: 'menu-1', quantity: 1 }, { productId: 'menu-7', quantity: 3 }],
    },
    {
      branchId: 'branch-2', tableId: 'tbl-17', cashierId: 'acc-cashier-hn', daysAgo: 0, hoursAgo: 6, guestCount: 5, paymentMethod: PaymentMethod.CASH, discountPercent: 5,
      items: [{ productId: 'menu-2', quantity: 3 }, { productId: 'menu-3', quantity: 2 }, { productId: 'menu-6', quantity: 4 }],
    },
    {
      branchId: 'branch-2', tableId: 'tbl-18', cashierId: 'acc-cashier-hn', daysAgo: 1, hoursAgo: 3, guestCount: 6, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-1', quantity: 3 }, { productId: 'menu-2', quantity: 2 }, { productId: 'menu-4', quantity: 2 }, { productId: 'menu-8', quantity: 4 }],
    },
    {
      branchId: 'branch-2', tableId: 'tbl-19', cashierId: 'acc-cashier-hn', daysAgo: 2, hoursAgo: 4, guestCount: 4, paymentMethod: PaymentMethod.CARD,
      items: [{ productId: 'menu-3', quantity: 2 }, { productId: 'menu-5', quantity: 2 }, { productId: 'menu-7', quantity: 2 }],
    },
    {
      branchId: 'branch-2', tableId: 'tbl-20', cashierId: 'acc-cashier-hn', daysAgo: 3, hoursAgo: 2, guestCount: 3, paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'menu-2', quantity: 3 }, { productId: 'menu-6', quantity: 3 }],
    },

    // === CHI NHÁNH 3: ĐÀ NẴNG (6 hóa đơn: 4 hôm nay + 2 trong 2 ngày qua) ===
    {
      branchId: 'branch-3', tableId: 'tbl-23', cashierId: 'acc-cashier-dn', daysAgo: 0, hoursAgo: 1, guestCount: 4, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-3', quantity: 2 }, { productId: 'menu-4', quantity: 1 }, { productId: 'menu-6', quantity: 3 }],
    },
    {
      branchId: 'branch-3', tableId: 'tbl-24', cashierId: 'acc-cashier-dn', daysAgo: 0, hoursAgo: 3, guestCount: 2, paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'menu-1', quantity: 2 }, { productId: 'menu-7', quantity: 2 }],
    },
    {
      branchId: 'branch-3', tableId: 'tbl-25', cashierId: 'acc-cashier-dn', daysAgo: 0, hoursAgo: 4, guestCount: 4, paymentMethod: PaymentMethod.CARD,
      items: [{ productId: 'menu-2', quantity: 2 }, { productId: 'menu-5', quantity: 2 }, { productId: 'menu-8', quantity: 3 }],
    },
    {
      branchId: 'branch-3', tableId: 'tbl-26', cashierId: 'acc-cashier-dn', daysAgo: 0, hoursAgo: 6, guestCount: 5, paymentMethod: PaymentMethod.VIETQR,
      items: [{ productId: 'menu-1', quantity: 2 }, { productId: 'menu-3', quantity: 2 }, { productId: 'menu-6', quantity: 4 }],
    },
    {
      branchId: 'branch-3', tableId: 'tbl-27', cashierId: 'acc-cashier-dn', daysAgo: 1, hoursAgo: 3, guestCount: 6, paymentMethod: PaymentMethod.VIETQR, discountPercent: 5,
      items: [{ productId: 'menu-1', quantity: 3 }, { productId: 'menu-4', quantity: 2 }, { productId: 'menu-5', quantity: 2 }, { productId: 'menu-8', quantity: 4 }],
    },
    {
      branchId: 'branch-3', tableId: 'tbl-28', cashierId: 'acc-cashier-dn', daysAgo: 2, hoursAgo: 5, guestCount: 4, paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'menu-2', quantity: 2 }, { productId: 'menu-3', quantity: 2 }, { productId: 'menu-7', quantity: 3 }],
    },
  ];

  const nowMs = Date.now();
  let saleSeq = 1;

  for (const sale of sampleSales) {
    const paidAt = new Date(
      nowMs - sale.daysAgo * 24 * 60 * 60 * 1000 - sale.hoursAgo * 60 * 60 * 1000,
    );
    const openedAt = new Date(paidAt.getTime() - 45 * 60 * 1000);
    const orderCreatedAt = new Date(openedAt.getTime() + 5 * 60 * 1000);
    const completedAt = new Date(orderCreatedAt.getTime() + 12 * 60 * 1000);

    const session = await prisma.orderSession.create({
      data: {
        tableId: sale.tableId,
        branchId: sale.branchId,
        guestCount: sale.guestCount,
        status: SessionStatus.CLOSED,
        openedAt,
        closedAt: paidAt,
        createdAt: openedAt,
      },
    });

    const branchTag =
      sale.branchId === 'branch-1' ? 'HCM' : sale.branchId === 'branch-2' ? 'HN' : 'DN';
    const seqStr = String(saleSeq).padStart(3, '0');

    const order = await prisma.order.create({
      data: {
        orderSessionId: session.id,
        orderCode: `ORD-${branchTag}-${seqStr}`,
        createdAt: orderCreatedAt,
      },
    });

    let subtotal = 0;
    const createdItems: Array<{ id: string; productId: string; quantity: number }> = [];

    for (const it of sale.items) {
      const meta = productMeta.get(it.productId)!;
      subtotal += meta.price * it.quantity;

      const createdItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: it.productId,
          kitchenStationId: meta.stationId,
          price: meta.price,
          quantity: it.quantity,
          status: OrderItemStatus.SERVED,
          startedAt: orderCreatedAt,
          completedAt,
          servedAt: completedAt,
          createdAt: orderCreatedAt,
        },
      });
      createdItems.push({ id: createdItem.id, productId: it.productId, quantity: it.quantity });
    }

    const discountPercent = sale.discountPercent ?? 0;
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const taxable = subtotal - discountAmount;
    const taxPercent = 8;
    const taxAmount = Math.round((taxable * taxPercent) / 100);
    const finalAmount = taxable + taxAmount;

    await prisma.invoice.create({
      data: {
        orderSessionId: session.id,
        branchId: sale.branchId,
        accountId: sale.cashierId,
        invoiceCode: `INV-${branchTag}-${seqStr}`,
        subtotal,
        discountPercent,
        discountAmount,
        taxPercent,
        taxAmount,
        finalAmount,
        paymentMethod: sale.paymentMethod,
        paymentStatus: PaymentStatus.PAID,
        cashGiven: sale.paymentMethod === PaymentMethod.CASH ? finalAmount : null,
        changeDue: sale.paymentMethod === PaymentMethod.CASH ? 0 : null,
        paidAt,
        createdAt: paidAt,
      },
    });

    // Tạo nhật ký trừ kho mẫu cho các đơn trong ngày hôm nay (để Tab Audit Log có dữ liệu thật)
    if (sale.daysAgo === 0 && createdItems.length > 0) {
      const firstItem = createdItems[0];
      const meta = productMeta.get(firstItem.productId)!;
      for (const bomEntry of meta.bom.slice(0, 2)) {
        const baseStock = ingredientStockMap.get(bomEntry.ingredientId) ?? 1000;
        const remaining =
          sale.branchId === 'branch-1' ? baseStock : Math.round(baseStock * 0.8);
        await prisma.inventoryAuditLog.create({
          data: {
            branchId: sale.branchId,
            ingredientId: bomEntry.ingredientId,
            orderItemId: firstItem.id,
            amountDeducted: bomEntry.quantity * firstItem.quantity,
            remainingStock: remaining,
            reason: `Tự động trừ kho BOM cho đơn ${order.orderCode} (${firstItem.quantity} suất)`,
            createdAt: completedAt,
          },
        });
      }
    }

    saleSeq++;
  }

  console.log(`✅ Hoàn tất Seeding Database thành công 100%! (${sampleSales.length} hóa đơn mẫu đã thanh toán)`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

