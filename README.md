# Wirelist Monorepo

A full-stack application for wire management built with Vue.js (frontend) and NestJS (backend).

## 📁 Project Structure

```
wirelist/
├── apps/
│   ├── web/              # Vue.js frontend application
│   └── api/              # NestJS backend application
├── packages/
│   └── typescript-config/ # Shared TypeScript configurations
├── package.json          # Root workspace configuration
├── turbo.json           # Turborepo configuration
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 10

### Installation

```bash
# Install all dependencies
npm install

# Generate Prisma client (required for API)
npm run prisma:generate --workspace=@wirelist/api
```

### Development

```bash
# Start all apps in development mode
npm run dev

# Start only frontend
npm run dev --workspace=@wirelist/web

# Start only backend
npm run dev --workspace=@wirelist/api
```

### Build

```bash
# Build all apps
npm run build

# Build specific app
npm run build --workspace=@wirelist/web
npm run build --workspace=@wirelist/api
```

### Testing

```bash
# Run all tests
npm run test

# Run tests for specific app
npm run test --workspace=@wirelist/web
npm run test --workspace=@wirelist/api
```

### Linting & Formatting

```bash
# Lint all apps
npm run lint

# Format all apps
npm run format
```

## 📦 Apps

### @wirelist/web (Frontend)

- **Framework**: Vue.js 3 with Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Testing**: Vitest + Cypress

Default port: `5173`

### @wirelist/api (Backend)

- **Framework**: NestJS
- **Database**: Prisma ORM
- **Authentication**: JWT with Passport.js
- **Documentation**: Swagger/OpenAPI

Default port: `3002`

## 🔧 Environment Variables

### Frontend (`apps/web/.env`)

```env
VITE_API_BASE_URL_V2=http://localhost:3002
```

### Backend (`apps/api/.env`)

```env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/wirelist_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="1h"
```

## 🐳 Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📚 Useful Commands

```bash
# Clean all build artifacts and dependencies
npm run clean

# Run type checking
npm run typecheck

# Prisma commands (API)
npm run prisma:generate --workspace=@wirelist/api
npm run prisma:migrate --workspace=@wirelist/api
npm run prisma:studio --workspace=@wirelist/api
```

## 🏗️ Architecture

This monorepo uses:

- **npm workspaces** for package management
- **Turborepo** for build orchestration and caching
- **Shared configurations** for consistency across apps

