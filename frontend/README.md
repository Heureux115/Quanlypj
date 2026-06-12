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

Nếu backend chạy khác origin, tạo file `.env` trong thư mục `ITSS/frontend`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Nếu không cấu hình, frontend sẽ gọi API cùng origin với tiền tố `/api`.

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
