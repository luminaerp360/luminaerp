# Lumina ERP - Claude AI Context

## Project Overview

**Lumina ERP** is a comprehensive Enterprise Resource Planning system built as a monorepo using modern web technologies. It provides multi-tenant support with advanced inventory management, financial accounting, sales, and subscription licensing features.

### Tech Stack
- **Monorepo Management**: pnpm workspaces + Turborepo
- **Backend**: NestJS, Prisma ORM, PostgreSQL, Redis
- **Frontend**: Angular 17, TailwindCSS, Flowbite
- **Multi-Platform**: Web, Desktop (Electron), Mobile (Capacitor - iOS/Android)

---

## Architecture

### Monorepo Structure

```
lumina-erp/
├── apps/
│   ├── backend/          # NestJS REST API (Port 3000)
│   └── frontend/         # Angular 17 Web App (Port 4200)
├── packages/
│   └── shared/           # Shared TypeScript types & utilities
├── .github/
│   └── copilot-instructions.md  # AI coding instructions
├── package.json          # Root workspace config
├── pnpm-workspace.yaml
└── turbo.json
```

### Package Names
- `@lumina/backend` - Backend API
- `@lumina/frontend` - Frontend application
- `@lumina/shared` - Shared package

---

## Backend Architecture (NestJS)

### Core Technologies
- **Framework**: NestJS 10.x
- **ORM**: Prisma with PostgreSQL
- **Cache**: Redis (with in-memory fallback)
- **Auth**: JWT with passport-jwt
- **API Documentation**: Swagger/OpenAPI
- **File Upload**: Cloudinary integration
- **PDF Generation**: Puppeteer, PDFKit
- **Excel**: XLSX library
- **Email**: Nodemailer
- **Thermal Printing**: node-thermal-printer

### Database Schema Highlights
- **50+ Models** with complex relations
- **Multi-tenant**: `Organization`, `Subscription`, `OfflineSubscription`, `Device`
- **Inventory**: `Product`, `InventoryBatch`, `InventoryMovement`, `WarehouseLocation`, `SerialNumber`, `ReorderRule`
- **Sales**: `Order`, `Invoice`, `Quotation`, `LPO`, `CreditSale`
- **Financial**: `ChartOfAccount`, `AccountsPayable`, `AccountsReceivable`, `PaymentsTransaction`, `Expense`
- **CRM**: `Customer`, `Supplier`, `Ticket`
- **Users**: `User`, `Role`, `Permission`
- **Audit**: `SystemLog`, `InventoryMovement`

### Backend Modules (apps/backend/src/)

| Module | Purpose |
|--------|---------|
| `auth` | JWT authentication, role-based guards |
| `inventory` | Stock management, batch tracking, FIFO/FEFO |
| `products` | Product catalog, pricing, categories |
| `orders` | Sales orders |
| `invoices` | Invoice generation & management |
| `quotations` | Price quotations |
| `lpo` | Local Purchase Orders |
| `customers` | Customer management |
| `surpliers` | Supplier management |
| `stock-tranfer` | Warehouse transfers |
| `chart-of-accounts` | Financial COA hierarchy |
| `accounts-payable` | Payables tracking |
| `accounts-receivable` | Receivables tracking |
| `payments-transactions` | Payment processing |
| `expense` | Expense tracking |
| `commission` | Sales commission calculation |
| `credit-sale` | Credit sales management |
| `credit-sale-payments` | Credit payment tracking |
| `tickets` | Support ticket system |
| `notifications` | Real-time notifications |
| `organization` | Multi-org support |
| `offline-subscription` | License management |
| `user` | User management |
| `settings` | App configuration |
| `reports` | Reporting engine |
| `system-logs` | Audit logging |
| `printer` | Thermal printer integration |
| `printing-jobs` | Print job queue |
| `emails` | Email service |
| `redis` | Redis caching layer |
| `prisma` | Database service |
| `config` | App configuration |
| `mpesa-auth` | M-Pesa payment integration |
| `org-details` | Organization details |

### Key Backend Patterns

#### 1. PrismaService (Global)
```typescript
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExampleService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.model.findMany({
      where: { organizationId }
    });
  }
}
```

#### 2. Redis Caching
```typescript
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ExampleService {
  constructor(private redisService: RedisService) {}

  async getCached(key: string) {
    return this.redisService.get(key);
  }
}
```

#### 3. JWT Guards
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('example')
@UseGuards(JwtGuard, RolesGuard)
export class ExampleController {
  @Get()
  @Roles('ADMIN', 'SALES_PERSON')
  findAll() {
    // Protected endpoint
  }
}
```

#### 4. Multi-Tenant Filtering
Always filter by `organizationId` from JWT token:
```typescript
@Get()
async findAll(@Request() req) {
  const organizationId = req.user.organizationId;
  return this.prisma.product.findMany({
    where: { organizationId }
  });
}
```

#### 5. DTOs with Validation
```typescript
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
```

### Special Backend Features

#### FIFO/FEFO Batch Tracking
- Location: `apps/backend/src/inventory/services/batch-tracking.service.ts`
- Handles automatic batch rotation based on FIFO (First-In-First-Out) or FEFO (First-Expired-First-Out)
- Tracks expiry dates, batch numbers, serial numbers

#### Inventory Movement Audit Trail
- Location: `apps/backend/src/inventory/services/inventory-movement.service.ts`
- Logs all stock movements: purchases, sales, transfers, adjustments
- Provides complete audit trail for compliance

#### Subscription & License Management
- Online: `Subscription` model with device/user/location limits
- Offline: `OfflineSubscription` with anti-backdating protection
- Device tracking and activation

---

## Frontend Architecture (Angular)

### Core Technologies
- **Framework**: Angular 17.1.0
- **UI**: TailwindCSS 3.4.3 + Flowbite 2.4.1
- **Routing**: Angular Router with guards
- **HTTP**: HttpClient with interceptors
- **State**: RxJS BehaviorSubjects
- **Notifications**: @ngneat/hot-toast
- **Modals**: @ng-vibe/dialog
- **Charts**: ApexCharts (ng-apexcharts)
- **PDF**: jsPDF with jspdf-autotable
- **Date**: date-fns
- **Crypto**: crypto-js

### Multi-Platform Support
- **Web**: Standard Angular build
- **Desktop**: Electron wrapper (see `electron-main.js`, `preload.js`)
- **Mobile**: Capacitor for iOS/Android (configs in `capacitor.config.ts`)
- **Printing**: Thermal printer via @awesome-cordova-plugins/printer

### Frontend Structure (apps/frontend/src/app/)

```
app/
├── modules/               # Feature modules
│   ├── auth/             # Login, register, password reset
│   ├── layout/           # Main layout & auth layout
│   ├── dashboard/        # Dashboard views
│   ├── inventory/        # Inventory management
│   ├── sales/            # Sales module
│   ├── customers/        # Customer management
│   ├── surpliers/        # Supplier management
│   ├── quotations/       # Quotations
│   ├── lpo/              # LPO management
│   ├── stock-transfer/   # Stock transfers
│   ├── chart-of-accounts/# COA management
│   ├── accounts-payable/ # Payables
│   ├── accounts-receivable/ # Receivables
│   ├── commission/       # Commission tracking
│   ├── expenses/         # Expense management
│   ├── finance/          # Financial reports
│   ├── reports/          # Reports
│   ├── setting/          # Settings
│   ├── notifications/    # Notifications
│   ├── tickets/          # Support tickets
│   ├── system-logs/      # Audit logs
│   └── categories-products/ # Product categories
├── shared/
│   ├── Services/         # API services
│   ├── Data/
│   │   └── components/   # Reusable components
│   │       ├── loader/
│   │       ├── modal/
│   │       ├── auth/
│   │       └── credit-auth/
│   ├── guards/           # Route guards
│   ├── interceptors/     # HTTP interceptors
│   └── pipes/            # Custom pipes
├── types/                # TypeScript interfaces
└── app-routing.module.ts
```

### Key Frontend Patterns

#### 1. API Services
Services in `shared/Services/` match backend endpoints:
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }

  createProduct(product: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, product);
  }
}
```

#### 2. Authentication Flow
- `AuthService` stores JWT in localStorage
- `AuthInterceptor` attaches token to requests
- `AuthGuard` protects routes

```typescript
// Route protection
{
  path: 'dashboard',
  component: DashboardComponent,
  canActivate: [AuthGuard]
}
```

#### 3. State Management
Uses RxJS BehaviorSubjects:
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  setCurrentUser(user: User) {
    this.currentUserSubject.next(user);
  }
}
```

#### 4. Layouts
- `MainLayoutComponent` - Authenticated users (sidebar, header)
- `AuthLayoutComponent` - Login/register pages

---

## Development Workflow

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended: 8.15.0)
- PostgreSQL
- Redis (optional, has fallback)

### Installation

```bash
# Install pnpm globally
npm install -g pnpm@8.15.0

# Clone repository
git clone <repo-url>
cd lumina-erp

# Install all dependencies (from root ONLY)
pnpm install

# Start Docker services (PostgreSQL + Redis)
pnpm docker:up

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:deploy

# Initialize database counters
cd apps/backend
pnpm init:counters
cd ../..
```

### Development Commands (from root)

```bash
# Start backend (Port 3000)
pnpm dev:backend

# Start frontend (Port 4200)
pnpm dev:frontend

# Start both
pnpm dev
```

### Windows Batch Files (Convenience)
```cmd
RUN_FRONTEND.bat    # Starts frontend only
RUN_BOTH.bat        # Starts frontend & admin simultaneously
```

### Database Management

```bash
# After schema changes
pnpm prisma:generate
pnpm prisma:deploy

# Visual database browser
cd apps/backend
npx prisma studio  # Opens on localhost:5555
```

### Building for Production

```bash
# Build all
pnpm build

# Build specific app
pnpm build:backend
pnpm build:frontend

# Start production servers
pnpm start:backend  # Port 3000
pnpm start:frontend # Port 8080
```

---

## Critical Development Rules

### ⚠️ NEVER Run Commands Inside Apps
**ALWAYS** run `pnpm install` and `pnpm` commands from the **root directory**. Running inside individual apps breaks the monorepo.

```bash
# ✅ CORRECT
cd lumina-erp
pnpm install
pnpm dev:frontend

# ❌ WRONG
cd apps/frontend
pnpm install  # DON'T DO THIS!
```

### Multi-Tenant Development

**Always filter by organizationId:**
- Backend automatically extracts `organizationId` from JWT
- Frontend services rely on backend filtering
- Never expose cross-organization data

### Port Conflicts (Windows)

```cmd
# Find process using port
netstat -ano | findstr :4200

# Kill process
taskkill /PID <PID> /F
```

### Cache Issues
- Clear browser cache: Ctrl+Shift+Delete
- Hard refresh: Ctrl+Shift+R
- Use separate browser profiles for frontend/admin

---

## Key Features

### 1. Advanced Inventory Management
- **Batch Tracking**: FIFO/FEFO rotation
- **Serial Numbers**: Track individual items
- **Warehouse Locations**: Multi-level hierarchy
- **Expiry Management**: Automatic alerts
- **Reorder Rules**: Automated replenishment
- **Stock Transfers**: Inter-warehouse movements
- **Inventory Movements**: Complete audit trail

### 2. Sales & Orders
- Sales orders with real-time inventory updates
- Invoice generation (PDF/thermal printing)
- Quotations with conversion to orders
- Credit sales with payment tracking
- LPO (Local Purchase Orders)
- Multi-payment methods
- Commission tracking

### 3. Financial Accounting
- Chart of Accounts (COA) with hierarchies
- Accounts Payable management
- Accounts Receivable tracking
- Payment transactions
- Expense tracking
- Financial reports

### 4. CRM Features
- Customer management
- Supplier management
- Support ticket system
- Credit limits & terms
- Transaction history

### 5. Multi-Tenant & Licensing
- Organization isolation
- Subscription plans (online)
- Offline license management
- Device tracking & limits
- User/location limits

### 6. Notifications & Alerts
- Real-time notification system
- Low stock alerts
- Expiry alerts
- Payment reminders

### 7. Reports & Analytics
- Sales reports
- Inventory reports
- Financial reports
- Commission reports
- Custom date ranges

### 8. User Management
- Role-based access control
- Permissions system
- Multi-device support
- Activity logging

---

## Environment Configuration

### Backend (.env in apps/backend/)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/lumina_erp"

# Redis (optional)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="7d"

# App
PORT=3000
NODE_ENV="development"

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email (optional)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"

# M-Pesa (optional)
MPESA_CONSUMER_KEY="your-key"
MPESA_CONSUMER_SECRET="your-secret"
MPESA_SHORTCODE="your-shortcode"
```

### Frontend (environment files in apps/frontend/src/environments/)
```typescript
// environment.ts (development)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};

// environment.prod.ts (production)
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com'
};
```

---

## Testing & Debugging

### Backend Testing
```bash
cd apps/backend

# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov

# E2E tests
pnpm test:e2e
```

### Frontend Testing
```bash
cd apps/frontend

# Run tests
pnpm test
```

### Debugging Tips

1. **Check System Logs**: All requests logged to `system_logs` table
2. **Redis Fallback**: System works without Redis (uses in-memory cache)
3. **Prisma Studio**: Visual database browser for data inspection
4. **Network Tab**: Check API requests in browser DevTools
5. **Console Logs**: Backend logs in terminal, frontend in browser

---

## Deployment

### Deployment Files
- `ecosystem.config.js` - PM2 configuration
- `deploy.sh` - Deployment script
- `nginx-backend.conf` - Nginx config for backend
- `nginx-frontend.conf` - Nginx config for frontend

### Production Ports
- Backend: 3000
- Frontend: 8080

### Deployment Guide
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete instructions.

---

## Documentation References

### Root Documentation
- [README.md](README.md) - Overview
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment
- [COMPLETE_INVOICE_SYSTEM.md](COMPLETE_INVOICE_SYSTEM.md) - Invoice system
- [COMMISSION_SYSTEM_GUIDE.md](COMMISSION_SYSTEM_GUIDE.md) - Commission
- [TICKETING_SYSTEM_GUIDE.md](TICKETING_SYSTEM_GUIDE.md) - Tickets
- [NOTIFICATION_SYSTEM_GUIDE.md](NOTIFICATION_SYSTEM_GUIDE.md) - Notifications
- [SETTINGS_MODULE_GUIDE.md](SETTINGS_MODULE_GUIDE.md) - Settings
- [FRONTEND_INTEGRATION_GUIDE.md](FRONTEND_INTEGRATION_GUIDE.md) - Frontend

### Backend Documentation
- [apps/backend/README.md](apps/backend/README.md)
- [apps/backend/MODERN_INVENTORY_SYSTEM.md](apps/backend/MODERN_INVENTORY_SYSTEM.md)
- [apps/backend/EXPORT_IMPORT_GUIDE.md](apps/backend/EXPORT_IMPORT_GUIDE.md)
- [apps/backend/src/chart-of-accounts/README.md](apps/backend/src/chart-of-accounts/README.md)

### Frontend Documentation
- [apps/frontend/README.md](apps/frontend/README.md)
- [apps/frontend/DEPLOYMENT.md](apps/frontend/DEPLOYMENT.md)
- [apps/frontend/PERMISSION_IMPLEMENTATION_GUIDE.md](apps/frontend/PERMISSION_IMPLEMENTATION_GUIDE.md)
- [apps/frontend/QUICK_REFERENCE.md](apps/frontend/QUICK_REFERENCE.md)

---

## Common Tasks

### Adding a New Backend Endpoint

1. Update Prisma schema if needed
```bash
# Edit apps/backend/prisma/schema.prisma
pnpm prisma:generate
pnpm prisma:deploy
```

2. Create DTOs in module
```typescript
// apps/backend/src/module/dto/create-example.dto.ts
export class CreateExampleDto {
  @IsString()
  name: string;
}
```

3. Add service method
```typescript
// apps/backend/src/module/module.service.ts
@Injectable()
export class ModuleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExampleDto, organizationId: string) {
    return this.prisma.example.create({
      data: { ...dto, organizationId }
    });
  }
}
```

4. Add controller endpoint
```typescript
// apps/backend/src/module/module.controller.ts
@Controller('module')
@UseGuards(JwtGuard)
export class ModuleController {
  constructor(private service: ModuleService) {}

  @Post()
  create(@Body() dto: CreateExampleDto, @Request() req) {
    return this.service.create(dto, req.user.organizationId);
  }
}
```

### Adding a New Frontend Page

1. Generate component
```bash
cd apps/frontend
ng g c modules/module/components/component-name
```

2. Add route
```typescript
// apps/frontend/src/app/modules/module/module-routing.module.ts
{
  path: 'new-page',
  component: ComponentNameComponent,
  canActivate: [AuthGuard]
}
```

3. Create service if needed
```bash
ng g s shared/Services/example
```

### Working with Inventory

**ALWAYS use BatchTrackingService** for stock operations:
```typescript
import { BatchTrackingService } from '../services/batch-tracking.service';
import { InventoryMovementService } from '../services/inventory-movement.service';

// Deduct stock (FIFO/FEFO)
await this.batchTrackingService.deductStock({
  productId,
  quantity,
  organizationId,
  warehouseLocationId
});

// Log movement
await this.inventoryMovementService.create({
  productId,
  quantity,
  type: 'SALE',
  organizationId
});
```

---

## Troubleshooting

### Common Issues

#### 1. Prisma Client Not Generated
```bash
pnpm prisma:generate
```

#### 2. Database Migration Issues
```bash
# Reset database (⚠️ loses data)
cd apps/backend
npx prisma migrate reset

# Deploy pending migrations
pnpm prisma:deploy
```

#### 3. Port Already in Use
```cmd
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### 4. Module Not Found Errors
```bash
# Clean and reinstall
pnpm clean
rm -rf node_modules
pnpm install
```

#### 5. Angular Build Errors
```bash
# Clean Angular cache
pnpm clean:frontend
cd apps/frontend
npm install
```

#### 6. Redis Connection Issues
Redis is optional - system will fall back to in-memory cache if unavailable.

---

## Project Conventions

### Naming Conventions
- **Files**: kebab-case (e.g., `user-service.ts`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions/Variables**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`)
- **Interfaces**: PascalCase with `I` prefix (e.g., `IUser`)

### Code Organization
- **Backend**: Domain-driven modules in `src/`
- **Frontend**: Feature modules in `modules/`
- **Shared**: Common code in `packages/shared/`

### Git Workflow
- Main branch: `main`
- Feature branches: `feature/feature-name`
- Bug fixes: `fix/bug-name`

---

## Performance Considerations

### Backend Optimization
- Redis caching for frequently accessed data
- Database indexing on foreign keys
- Pagination for large datasets
- Lazy loading for relations

### Frontend Optimization
- Lazy loading modules
- OnPush change detection strategy
- Virtual scrolling for long lists
- Image optimization (Cloudinary)

---

## Security Features

### Backend Security
- JWT authentication with expiration
- Password hashing with argon2
- Role-based access control (RBAC)
- Organization isolation
- SQL injection protection (Prisma)
- CORS configuration

### Frontend Security
- Auth guards on routes
- Token storage in localStorage
- HTTP interceptor for auth headers
- XSS protection (Angular sanitization)

---

## API Documentation

### Swagger UI
When backend is running, access API docs at:
```
http://localhost:3000/api
```

### API Structure
- Base URL: `http://localhost:3000`
- Auth: Bearer token in Authorization header
- Response format: JSON

---

## Support & Maintenance

### Logging
- **Backend**: All requests logged to `system_logs` table via `LoggingInterceptor`
- **Frontend**: Console logs in development mode

### Monitoring
- System logs module for audit trail
- Database query monitoring via Prisma
- Redis cache hit/miss tracking

### Backup
- Regular database backups recommended
- Export/import functionality for data migration

---

## Future Enhancements

See individual guide files for planned features:
- [NEXT_STEPS.md](NEXT_STEPS.md)
- [PHASE_2_IMPLEMENTATION.md](PHASE_2_IMPLEMENTATION.md)

---

## Quick Reference

### Essential Commands
```bash
# Development
pnpm dev:backend          # Start backend
pnpm dev:frontend         # Start frontend
pnpm docker:up            # Start PostgreSQL + Redis

# Database
pnpm prisma:generate      # Generate Prisma client
pnpm prisma:deploy        # Run migrations
cd apps/backend && npx prisma studio  # Visual DB browser

# Build
pnpm build               # Build all
pnpm start:backend       # Start production backend
pnpm start:frontend      # Start production frontend

# Troubleshooting
pnpm clean               # Clean all
netstat -ano | findstr :3000  # Check port (Windows)
```

### Essential Paths
- Backend: `apps/backend/src/`
- Frontend: `apps/frontend/src/app/`
- Shared: `packages/shared/`
- Prisma Schema: `apps/backend/prisma/schema.prisma`
- Environment: `apps/backend/.env`, `apps/frontend/src/environments/`

---

## Contact & Resources

- **AI Instructions**: See [.github/copilot-instructions.md](.github/copilot-instructions.md) for detailed AI coding guidelines
- **Backend README**: [apps/backend/README.md](apps/backend/README.md)
- **Frontend README**: [apps/frontend/README.md](apps/frontend/README.md)

---

**Last Updated**: January 2026
**Version**: 1.0.0
**License**: UNLICENSED - Private Project
