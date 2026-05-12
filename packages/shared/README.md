# @lumina/shared

Shared types, utilities, and constants for Lumina ERP monorepo.

## Usage

### In Backend (NestJS)

```typescript
import { User, ApiResponse, ROLES } from '@lumina/shared';
```

### In Frontend (Angular)

```typescript
import { User, ApiResponse, ROLES } from '@lumina/shared';
```

## Structure

- `src/types/` - Shared TypeScript interfaces and types
- `src/constants/` - Shared constants and enums
- `src/utils/` - Shared utility functions

## Development

```bash
# Build the package
pnpm build

# Watch mode
pnpm dev
```
