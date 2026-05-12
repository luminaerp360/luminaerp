# Lumina ERP - AI Coding Agent Instructions

## Project Architecture

**Monorepo Structure**: pnpm workspace + Turborepo managing 3 apps + shared packages

- `apps/backend/` - NestJS REST API (Port 3000) with Prisma ORM, PostgreSQL, Redis caching
- `apps/frontend/` - Angular 17 main ERP (Port 4200, Port 8080 in production)
- `apps/admin/` - Angular 19 admin panel (Port 4201, Port 8081 in production)
- `packages/shared/` - Shared TypeScript types and utilities

**Critical**: Each Angular app has isolated dependencies. NEVER run `pnpm install` inside individual app folders - always from root.

**Currency Standard**: The entire system uses **KSH (Kenyan Shilling)** as the currency.

- Display format: `KSH {{ value }}` in templates
- Backend currency code: `KES` (Kenya Shillings - ISO 4217)
- NEVER use `$` or `USD` for currency display
- Currency formatters in services use `Intl.NumberFormat` with `currency: 'KES'`

## Development Workflow Commands

```bash
# From root only
pnpm dev:frontend          # Angular 17 dev server
pnpm dev:backend           # NestJS with watch mode
pnpm dev:admin             # Angular 19 dev server

# Windows batch files for convenience
RUN_FRONTEND.bat           # Runs frontend only
RUN_ADMIN.bat              # Runs admin only
RUN_BOTH.bat               # Runs both Angular apps simultaneously

# Database operations (from root)
pnpm prisma:generate       # After schema.prisma changes
pnpm prisma:deploy         # Run migrations
pnpm docker:up             # Start PostgreSQL + Redis via Docker Compose

# Backend-specific
cd apps/backend
pnpm init:counters         # Initialize database counters for invoices/orders
```

## Backend Architecture (NestJS)

**Module Organization**: Domain-driven with 30+ feature modules in [apps/backend/src](apps/backend/src):

- Auth: JWT-based with role guards (SUPER_ADMIN, ADMIN, SALES_PERSON, etc.)
- Core modules: `inventory/`, `invoices/`, `orders/`, `products/`, `customers/`
- Financial: `accounts-payable/`, `accounts-receivable/`, `chart-of-accounts/`, `commission/`, `expense/`
- Multi-tenant: `organization/` (multi-org support), `offline-subscription/` (license management)
- Infrastructure: `prisma/`, `redis/`, `emails/`, `notifications/`, `system-logs/`

**Key Patterns**:

1. **Global PrismaService**: Injected via `PrismaModule` - use `this.prisma.modelName.method()`
2. **Global Redis Caching**: Module in [apps/backend/src/redis](apps/backend/src/redis) with fallback to in-memory if Redis unavailable
3. **Interceptor Logging**: Global `LoggingInterceptor` logs all requests to `system_logs` table
4. **Organization Context**: Most entities have `organizationId` - ensure proper scoping in queries
5. **DTOs**: Use `class-validator` decorators; located in `{module}/dto/` folders

**Database Schema** ([apps/backend/prisma/schema.prisma](apps/backend/prisma/schema.prisma)):

- 2180+ lines, 50+ models with complex relations
- Multi-tenant: `Organization`, `Subscription`, `OfflineSubscription`, `Device` models
- Advanced inventory: `InventoryBatch`, `InventoryMovement`, `WarehouseLocation`, `ReorderRule`, `SerialNumber`
- Financial: `ChartOfAccount`, `AccountsPayable`, `AccountsReceivable`, `PaymentsTransaction`
- Features: FIFO/FEFO batch tracking, expiry management, warehouse location hierarchy

**Service Layer Examples**:

- [apps/backend/src/inventory/services/batch-tracking.service.ts](apps/backend/src/inventory/services/batch-tracking.service.ts) - FIFO/FEFO rotation logic
- [apps/backend/src/inventory/services/inventory-movement.service.ts](apps/backend/src/inventory/services/inventory-movement.service.ts) - Audit trail for all stock changes

## Frontend Architecture (Angular)

**Main App Structure** ([apps/frontend/src/app](apps/frontend/src/app)):

- `modules/` - Feature modules: `auth/`, `dashboard/`, `inventory/`, `sales/`, `customers/`, `surpliers/`, `quotations/`, `lpo/`, `stock-transfer/`, `chart-of-accounts/`, `accounts-payable/`, `accounts-receivable/`, `commission/`, `tickets/`, `notifications/`
- `shared/` - Shared components, services, guards, interceptors
  - `Services/` - API services matching backend endpoints (e.g., `auth.service.ts`, `inventory.service.ts`)
  - `Data/components/` - Reusable UI components: `loader`, `modal`, `auth`, `credit-auth`
- `types/` - TypeScript interfaces

**Key Patterns**:

1. **Service Naming**: Services are in `@Injectable({ providedIn: 'root' })` - match backend endpoint structure
2. **Auth Flow**: `AuthService` stores JWT in localStorage; `AuthInterceptor` attaches token to requests; `AuthGuard` protects routes
3. **Layout**: Two layouts - `MainLayoutComponent` (authenticated) and `AuthLayoutComponent` (login/register)
4. **State Management**: RxJS BehaviorSubjects in services (e.g., `currentUser$` in AuthService)
5. **UI Library**: Flowbite + TailwindCSS, `@ng-vibe/dialog` for modals, `@ngneat/hot-toast` for notifications

**Multi-Platform**:

- Desktop: Electron support (see `electron-main.js`, `preload.js`)
- Mobile: Capacitor (iOS/Android) - configs in `capacitor.config.ts`, `android/`, `ios/`
- Print: Thermal printer support via `@awesome-cordova-plugins/printer`

## Critical Multi-Tenant Patterns

**Always filter by organizationId**:

```typescript
// Backend (NestJS)
const products = await this.prisma.product.findMany({
  where: { organizationId: user.organizationId }
});

// Frontend (Angular service)
getProducts(): Observable<Product[]> {
  // Backend automatically filters by org from JWT token
  return this.http.get<Product[]>(`${this.apiUrl}/products`);
}
```

**Subscription/License System**:

- Online: `Subscription` model with `maxDevices`, `maxUsers`, `maxLocations`, license validation
- Offline: `OfflineSubscription` with anti-backdating protection, device tracking

## Testing & Debugging

**Port Conflicts** (common on Windows):

```cmd
netstat -ano | findstr :4200    # Find process using port
taskkill /PID <PID> /F          # Kill process
```

**Browser Cache Issues**: Angular version isolation can cause module conflicts

- Clear cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+Shift+R
- Use separate browser profiles for frontend vs admin if running both

**Database Debugging**:

```bash
cd apps/backend
npx prisma studio              # Visual database browser on localhost:5555
```

## Deployment (DigitalOcean/VPS)

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for full guide. Key points:

- PM2 config: [ecosystem.config.js](ecosystem.config.js) - runs backend (port 3000), frontend (port 8080), admin (port 8081)
- Nginx configs: `nginx-backend.conf`, `nginx-frontend.conf`, `nginx-admin.conf`
- Deployment script: [deploy.sh](deploy.sh) - handles build + PM2 restart
- Requires: Node 18+, PostgreSQL, Redis, pnpm 8.15.0

## Documentation References

**Feature-specific guides** (root directory):

- [MODERN_INVENTORY_SYSTEM.md](apps/backend/MODERN_INVENTORY_SYSTEM.md) - Batch tracking, FIFO/FEFO, warehouse locations
- [COMPLETE_INVOICE_SYSTEM.md](COMPLETE_INVOICE_SYSTEM.md) - Modern invoicing system
- [COMMISSION_SYSTEM_GUIDE.md](COMMISSION_SYSTEM_GUIDE.md) - Sales commission calculation
- [TICKETING_SYSTEM_GUIDE.md](TICKETING_SYSTEM_GUIDE.md) - Support ticket management
- [NOTIFICATION_SYSTEM_GUIDE.md](NOTIFICATION_SYSTEM_GUIDE.md) - Real-time notifications
- [SETTINGS_MODULE_GUIDE.md](SETTINGS_MODULE_GUIDE.md) - App settings and configurations
- [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md) - Frontend API integration patterns

## Common Task Patterns

**Adding a new backend endpoint**:

1. Update Prisma schema → `pnpm prisma:generate` → `pnpm prisma:deploy`
2. Create DTOs in `{module}/dto/`
3. Add service method with `@Injectable()` decorator
4. Add controller endpoint with `@UseGuards(JwtGuard)` for auth
5. Add module exports if used elsewhere

**Adding a new frontend page**:

1. Generate component: `cd apps/frontend && ng g c modules/{module}/components/{name}`
2. Add route to `{module}-routing.module.ts`
3. Create service if needed: `ng g s shared/Services/{name}`
4. Use `AuthGuard` on protected routes

**Working with inventory**:

- Always use `BatchTrackingService` for stock operations (FIFO rotation)
- Log movements via `InventoryMovementService` for audit trail
- Check warehouse locations via `WarehouseLocationService`
