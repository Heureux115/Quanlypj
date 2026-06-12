# PTMS Backend

Backend PTMS cung cấp REST API, xác thực JWT, phân quyền theo vai trò, realtime chat bằng Socket.IO, quản lý dự án/nhóm/công việc/báo cáo và tích hợp dữ liệu GitHub.

## Công nghệ

- Node.js
- Express
- Prisma
- PostgreSQL
- Socket.IO
- JSON Web Token

## Cài đặt

```bash
npm install
```

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Biến môi trường chính:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/itss
JWT_SECRET=dev-secret
JWT_EXPIRES_IN=7d
GITHUB_TOKEN=
```

## Database

Sinh Prisma client:

```bash
npm run prisma:generate
```

Chạy migration:

```bash
npm run prisma:migrate
```

Seed dữ liệu mẫu:

```bash
npm run seed
```

## Chạy server

Development:

```bash
npm run dev
```

Production/local start:

```bash
npm start
```

Server mặc định:

```text
http://localhost:5000
```

Health check:

```text
GET /api/health
```

## Cấu trúc chính

```text
controllers/      Logic xử lý API
middlewares/      Auth và phân quyền
prisma/           Schema và migrations
routes/           API route definitions
scripts/          Seed, smoke test, tiện ích database
utils/            JWT, GitHub sync, auto assign
index.js          Entry server
socket.js         Socket.IO setup
```

## Scripts

```bash
npm run dev
npm start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:studio
npm run seed
npm run db:clear
npm run db:fix-sequences
npm run smoke:test
```

## Tài khoản demo

Sau khi seed, mật khẩu mặc định là:

```text
123456
```

Một số email demo:

```text
admin@itss.local
lecturer@itss.local
student1@itss.local
student2@itss.local
```

## Lưu ý

- Không commit `.env`.
- Không commit `node_modules`, log hoặc file build.
- Đổi `JWT_SECRET`, `DATABASE_URL` và token GitHub trước khi deploy.
