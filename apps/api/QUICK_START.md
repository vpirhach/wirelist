# 🚀 Quick Start Guide

## Prerequisites Check

```bash
# Check Node.js version (should be 18+)
node --version

# Check npm
npm --version

# Check PostgreSQL
psql --version
```

## Installation (3 Steps)

### 1️⃣ Install Dependencies

```bash
cd /Users/valentynpirhach/dev/wirelist/wirelist-api-node
npm install
```

### 2️⃣ Generate Prisma Client

```bash
npm run prisma:generate
```

### 3️⃣ Start the Server

```bash
npm run start:dev
```

**Server should be running on:** http://localhost:3002

## Testing the API

### Option 1: Swagger UI (Recommended)

Open your browser: **http://localhost:3002/api-docs**

### Option 2: Command Line

```bash
# Step 1: Get JWT token from Java backend
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123!"}'

# Copy the accessToken from response

# Step 2: Use token with Node.js backend
curl -X GET "http://localhost:3002/wires?page=0&size=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Quick Commands Reference

```bash
# Start Development Server
npm run start:dev

# Build for Production
npm run build

# Start Production Server
npm run start:prod

# View Database in GUI
npm run prisma:studio

# Format Code
npm run format

# Lint Code
npm run lint

# Run Tests
npm run test
```

## Project URLs

| Service       | URL                                  |
| ------------- | ------------------------------------ |
| Node.js API   | http://localhost:3002                |
| Swagger Docs  | http://localhost:3002/api-docs       |
| Prisma Studio | http://localhost:5555 (when running) |
| Java API      | http://localhost:3001                |
| Frontend      | http://localhost:5173                |

## Verify Setup

Run this command to verify everything works:

```bash
npm run build
```

Expected output: `webpack 5.x compiled successfully`

## Common Issues & Solutions

### Port 3002 already in use

```bash
lsof -ti:3002 | xargs kill -9
```

### Database connection error

Check PostgreSQL is running:

```bash
pg_isready
```

### Prisma Client not found

```bash
npm run prisma:generate
```

## Environment Variables

Located in `.env` file:

```env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/wirelist_db"
PORT=3002
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
```

**Important:** `JWT_SECRET` must match the Java backend!

## File Structure Overview

```
wirelist-api-node/
├── src/
│   ├── modules/
│   │   ├── auth/          # 🔐 Authentication
│   │   └── wires/         # 📋 Wire management
│   ├── common/            # 🛠️ Shared utilities
│   └── main.ts            # 🚀 Entry point
├── prisma/
│   └── schema.prisma      # 🗄️ Database schema
├── .env                   # ⚙️ Configuration
└── package.json           # 📦 Dependencies
```

## Next Steps

1. ✅ Verify the server starts successfully
2. ✅ Test the `/wires` endpoint with Swagger
3. ✅ Get JWT token from Java backend
4. ✅ Test token compatibility
5. 📝 Start migrating additional endpoints

## Development Workflow

```bash
# 1. Start the dev server
npm run start:dev

# 2. Make changes to code
# The server will automatically reload! 🔄

# 3. Test your changes
# Visit http://localhost:3002/api-docs

# 4. Format and lint
npm run format
npm run lint

# 5. Build for production
npm run build
```

## Help & Documentation

- **README.md** - Full documentation
- **SETUP.md** - Detailed setup guide
- **JAVA_TO_NESTJS_COMPARISON.md** - Migration guide
- **PROJECT_SUMMARY.md** - Feature summary

## 🎉 You're Ready!

If the server starts without errors, you're all set! The NestJS backend is ready to use alongside your Java backend.
