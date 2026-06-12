# Setup

## Yêu cầu

- Node.js 20+.
- PostgreSQL hoặc Supabase/Postgres connection string.

## Backend

```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Backend mặc định chạy tại `http://localhost:5000`.

Các biến môi trường chính:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/itss
JWT_ACCESS_SECRET=dev-access-secret
JWT_SECRET=dev-secret
JWT_EXPIRES_IN=7d
GITHUB_TOKEN=
FRONTEND_ORIGIN=http://localhost:5173
```

## Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`.

## Dữ liệu demo

```bash
npm run seed
```

Tài khoản demo sau khi seed:

```text
admin@itss.local / 123456
lecturer@itss.local / 123456
student1@itss.local / 123456
student2@itss.local / 123456
```
