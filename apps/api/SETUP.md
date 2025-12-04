# Setup Guide - Wirelist API Node.js

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/valentynpirhach/dev/wirelist/wirelist-api-node
npm install
```

### 2. Configure Environment

The `.env` file is already configured with the same settings as your Java backend:

```env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/wirelist_db?schema=public"
PORT=3002
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

This will introspect your existing database and generate the Prisma Client.

### 4. Start the Application

```bash
# Development mode (with hot-reload)
npm run start:dev
```

The server will start on http://localhost:3002

### 5. Test the API

#### Option 1: Using Swagger UI

Visit: http://localhost:3002/api-docs

#### Option 2: Using curl

```bash
# First, get a JWT token from your Java backend
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123!"
  }'

# Copy the accessToken from the response
# Then use it with the Node.js backend

curl -X GET "http://localhost:3002/wires?page=0&size=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## Verification Checklist

✅ Node.js 18+ installed
✅ PostgreSQL running
✅ Java backend database exists (`wirelist_db`)
✅ Dependencies installed (`npm install`)
✅ Prisma Client generated (`npm run prisma:generate`)
✅ Application running on port 3002
✅ Swagger docs accessible at `/api-docs`
✅ JWT token from Java backend works with Node backend

## Common Commands

```bash
# Start in development mode
npm run start:dev

# Start in production mode
npm run build
npm run start:prod

# View database in Prisma Studio
npm run prisma:studio

# Run tests
npm run test

# Format code
npm run format

# Lint code
npm run lint
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Vue.js)                     │
│                   localhost:5173                         │
└───────────────────┬─────────────────┬───────────────────┘
                    │                 │
                    ▼                 ▼
        ┌──────────────────┐  ┌──────────────────┐
        │   Java Backend   │  │  Node.js Backend │
        │   (Spring Boot)  │  │    (NestJS)      │
        │  localhost:3001  │  │  localhost:3002  │
        └────────┬─────────┘  └─────────┬────────┘
                 │                      │
                 │  ┌──────────────────┐│
                 └─►│   PostgreSQL     ││
                    │   wirelist_db    │◄┘
                    │  localhost:5432  │
                    └──────────────────┘

Shared:
- Same database (wirelist_db)
- Same JWT secret (token compatibility)
- Same user authentication system
```

## Next Steps

After verifying the setup works:

1. Test JWT compatibility between backends
2. Compare responses between Java and Node endpoints
3. Migrate additional endpoints as needed
4. Update frontend to point to Node.js backend (when ready)

## Troubleshooting

### Port 3002 already in use

```bash
# Find and kill the process
lsof -ti:3002 | xargs kill -9
```

### Prisma Client errors

```bash
# Regenerate Prisma Client
npm run prisma:generate
```

### Database connection failed

```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U postgres -d wirelist_db
```

### JWT token not accepted

- Verify JWT_SECRET matches Java backend exactly
- Check token hasn't expired (24 hour expiration)
- Ensure Authorization header format: `Bearer <token>`
