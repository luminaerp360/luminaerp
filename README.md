# Lumina ERP Monorepo

Enterprise Resource Planning system with NestJS backend and Angular frontend, managed as a monorepo using pnpm workspaces and Turborepo.

## 📁 Project Structure

```
lumina-erp/
├── apps/
│   ├── backend/          # NestJS API server
│   └── frontend/         # Angular web application
├── packages/
│   └── shared/           # Shared types, utilities, and constants
├── package.json          # Root workspace configuration
├── pnpm-workspace.yaml   # pnpm workspace definition
└── turbo.json           # Turborepo pipeline configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install all dependencies for all packages
pnpm install
```

## 📦 Available Commands

### Development

```bash
# Run both frontend and backend in development mode
pnpm dev

# Run only backend
pnpm dev:backend

# Run only frontend
pnpm dev:frontend
```

### Build

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build:backend
pnpm build:frontend
```

### Production

```bash
# Start production servers (requires build first)
pnpm start

# Start specific app
pnpm start:backend
pnpm start:frontend
```

### Other Commands

```bash
# Run linting
pnpm lint

# Run tests
pnpm test

# Format code
pnpm format

# Clean all build artifacts and node_modules
pnpm clean
```

### Database Commands (Backend)

```bash
# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:deploy

# Start Docker containers (PostgreSQL, Redis, etc.)
pnpm docker:up

# Stop Docker containers
pnpm docker:down
```

## 🏗️ Apps & Packages

### Apps

- **`@lumina/backend`**: NestJS API server
  - Location: `apps/backend/`
  - Port: 3000 (default)
  - Tech: NestJS, Prisma, PostgreSQL, Redis, JWT, Swagger

- **`@lumina/frontend`**: Angular web application
  - Location: `apps/frontend/`
  - Port: 4200 (default)
  - Tech: Angular 17, Capacitor, Electron, TailwindCSS

### Packages

- **`@lumina/shared`**: Shared TypeScript types, utilities, and constants
  - Location: `packages/shared/`
  - Used by both frontend and backend

## 🔧 Configuration

### Environment Variables

Create `.env` files in each app directory:

**Backend (`apps/backend/.env`):**
```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="your-secret-key"
```

**Frontend (`apps/frontend/.env`):**
```env
API_URL="http://localhost:3000"
```

## 📝 Development Workflow

1. **Start development servers:**
   ```bash
   pnpm dev
   ```

2. **Make changes to code:**
   - Backend changes will auto-reload via NestJS watch mode
   - Frontend changes will auto-reload via Angular dev server

3. **Build for production:**
   ```bash
   pnpm build
   ```

## 🔗 Using Shared Package

The `@lumina/shared` package contains common types and utilities.

**In Backend:**
```typescript
import { User, ApiResponse, ROLES } from '@lumina/shared';
```

**In Frontend:**
```typescript
import { User, ApiResponse, ROLES } from '@lumina/shared';
```

## 🚢 Deployment

### Backend

```bash
cd apps/backend
pnpm build
pnpm start:prod
```

### Frontend

```bash
cd apps/frontend
pnpm build
# Serve the dist/ folder with your preferred static server
```

## 🛠️ Tech Stack

### Backend
- NestJS
- Prisma ORM
- PostgreSQL
- Redis
- JWT Authentication
- Swagger/OpenAPI
- Docker

### Frontend
- Angular 17
- TailwindCSS
- Capacitor (Mobile)
- Electron (Desktop)
- ApexCharts

### Monorepo Tools
- pnpm Workspaces
- Turborepo
- TypeScript

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Angular Documentation](https://angular.io/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)

## 📄 License

UNLICENSED - Private Project
