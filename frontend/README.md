# PTMS Frontend

Frontend của PTMS được xây dựng bằng React + Vite. Giao diện sử dụng tiếng Việt, bố cục dashboard hiện đại và phân quyền theo vai trò người dùng.

## Cài đặt

```bash
npm install
```

## Chạy development

```bash
npm run dev
```

Mặc định Vite chạy tại:

```text
http://localhost:5173
```

## Cấu hình API

Tạo file `.env` từ `.env.example` nếu backend chạy khác origin hoặc cần cấu hình Socket.IO rõ ràng:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

Nếu không cấu hình `VITE_API_BASE_URL`, frontend sẽ gọi API cùng origin với tiền tố `/api`.

## Build production

```bash
npm run build
```

## Vai trò và điều hướng

- `ADMIN`: tổng quan hệ thống, quản lý người dùng, duyệt tài khoản, hồ sơ.
- `LECTURER`: tổng quan giảng viên, dự án phụ trách, báo cáo nhóm, chấm điểm, hồ sơ.
- `STUDENT`: không gian dự án, nhóm của tôi, công việc cá nhân, trò chuyện, hồ sơ.
- Nhóm trưởng không phải role riêng; quyền nhóm trưởng được tính từ nhóm đang chọn.

## Ghi chú

- Không đổi endpoint API ở frontend nếu không cập nhật backend tương ứng.
- Không commit `dist`, `.env`, log hoặc artifact trình duyệt.
