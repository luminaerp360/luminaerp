# Modern Product Management System

## Overview

This document outlines the comprehensive modernization of the Lumina ERP product management system, based on best practices from leading POS and ERP systems (Square, Shopify POS, Toast, Lightspeed, SAP, Oracle NetSuite, Odoo).

---

## 🎯 Key Modernization Features

### 1. **Product Variants & SKU Management**

Modern POS systems allow products to have variants (e.g., T-shirt in Small/Medium/Large, Red/Blue/Green).

**Features:**

- Master product with multiple variants
- Each variant has unique SKU, price, stock level
- Variant attributes (Size, Color, Material, etc.)
- Automatic SKU generation
- Variant-level images
- Matrix view for quick variant management

**Database Schema:**

```prisma
model ProductVariant {
  id              Int      @id @default(autoincrement())
  productId       Int
  sku             String   @unique
  variantName     String   // e.g., "Small - Red"
  attributeValues Json     // { "size": "Small", "color": "Red" }
  price           Float?
  cost            Float?
  quantity        Int      @default(0)
  barcode         String?
  imageUrl        String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_variants")
}

model ProductAttribute {
  id             Int      @id @default(autoincrement())
  organizationId Int
  name           String   // e.g., "Size", "Color"
  values         String[] // e.g., ["Small", "Medium", "Large"]
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, name])
  @@map("product_attributes")
}
```

---

### 2. **Multiple Images Support**

Allow multiple product images for better product presentation.

**Features:**

- Primary image + gallery images
- Drag & drop upload
- Image reordering
- Variant-specific images
- Cloudinary integration
- Image optimization

**Database Schema:**

```prisma
model ProductImage {
  id         Int      @id @default(autoincrement())
  productId  Int
  url        String
  publicId   String?  // Cloudinary public ID
  isPrimary  Boolean  @default(false)
  sortOrder  Int      @default(0)
  caption    String?
  createdAt  DateTime @default(now())

  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_images")
}
```

---

### 3. **Multiple Unit of Measure (UOM)**

Sell products in different units (piece, box, carton, kg, liter).

**Features:**

- Base UOM (e.g., piece)
- Conversion between UOMs (1 box = 12 pieces)
- UOM-specific pricing
- UOM in sales and purchases
- Automatic stock conversion

**Database Schema:**

```prisma
model UnitOfMeasure {
  id             Int      @id @default(autoincrement())
  organizationId Int
  name           String   // e.g., "Box", "Carton", "Kilogram"
  abbreviation   String   // e.g., "box", "ctn", "kg"
  type           String   // QUANTITY, WEIGHT, VOLUME, LENGTH
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, name])
  @@map("unit_of_measures")
}

model ProductUOM {
  id             Int      @id @default(autoincrement())
  productId      Int
  uomId          Int
  conversionRate Float    // How many base units in this UOM
  price          Float?
  cost          Float?
  barcode        String?
  isBaseUnit     Boolean  @default(false)
  isPurchaseUnit Boolean  @default(false)
  isSalesUnit    Boolean  @default(true)

  product        Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  uom            UnitOfMeasure   @relation(fields: [uomId], references: [id])

  @@unique([productId, uomId])
  @@map("product_uoms")
}
```

---

### 4. **Price Tiers & Dynamic Pricing**

Different prices for different customer types or quantities.

**Features:**

- Price tiers (Retail, Wholesale, VIP, Employee)
- Customer-specific pricing
- Quantity-based pricing (buy 10+, get discount)
- Time-based promotions
- Automatic price calculation

**Database Schema:**

```prisma
model PriceTier {
  id             Int      @id @default(autoincrement())
  organizationId Int
  name           String   // "Retail", "Wholesale", "VIP"
  description    String?
  isDefault      Boolean  @default(false)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())

  organization   Organization    @relation(fields: [organizationId], references: [id])
  productPrices  ProductPricing[]

  @@unique([organizationId, name])
  @@map("price_tiers")
}

model ProductPricing {
  id          Int       @id @default(autoincrement())
  productId   Int
  tierId      Int
  price       Float
  minQuantity Int       @default(1)
  maxQuantity Int?
  startDate   DateTime?
  endDate     DateTime?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  tier        PriceTier @relation(fields: [tierId], references: [id])

  @@map("product_pricing")
}
```

---

### 5. **Product Tags & Categories**

Flexible organization with tags and multi-level categories.

**Features:**

- Multiple tags per product
- Tag-based filtering
- Tag cloud
- Hierarchical categories
- Cross-category products

**Database Schema:**

```prisma
model ProductTag {
  id             Int      @id @default(autoincrement())
  organizationId Int
  name           String
  color          String?  // Hex color for UI
  createdAt      DateTime @default(now())

  organization   Organization      @relation(fields: [organizationId], references: [id])
  products       ProductTagMapping[]

  @@unique([organizationId, name])
  @@map("product_tags")
}

model ProductTagMapping {
  productId Int
  tagId     Int

  product   Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag       ProductTag @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@map("product_tag_mappings")
}
```

---

### 6. **Product Lifecycle & Status Management**

Track product status through its lifecycle.

**Features:**

- Status: DRAFT, ACTIVE, DISCONTINUED, ARCHIVED
- Reason tracking for status changes
- Status history
- Automated actions based on status

**Enhanced Product Model:**

```prisma
model Product {
  // ... existing fields ...
  status             ProductStatus  @default(ACTIVE)
  statusReason       String?
  discontinuedAt     DateTime?
  archivedAt         DateTime?

  statusHistory      ProductStatusHistory[]
}

model ProductStatusHistory {
  id         Int           @id @default(autoincrement())
  productId  Int
  oldStatus  ProductStatus
  newStatus  ProductStatus
  reason     String?
  changedBy  Int
  changedAt  DateTime      @default(now())

  product    Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user       User    @relation(fields: [changedBy], references: [id])

  @@map("product_status_history")
}

enum ProductStatus {
  DRAFT
  ACTIVE
  DISCONTINUED
  ARCHIVED
}
```

---

### 7. **Product Bundles & Kits**

Sell multiple products as a bundle.

**Features:**

- Bundle pricing
- Component products
- Dynamic bundle availability
- Bundle-specific inventory

**Database Schema:**

```prisma
model ProductBundle {
  id          Int      @id @default(autoincrement())
  productId   Int      // The bundle product
  name        String
  description String?
  price       Float?   // Override price or sum of components
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  components  BundleComponent[]

  @@map("product_bundles")
}

model BundleComponent {
  id         Int      @id @default(autoincrement())
  bundleId   Int
  productId  Int      // Component product
  quantity   Float    @default(1)
  sortOrder  Int      @default(0)

  bundle     ProductBundle @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  product    Product       @relation(fields: [productId], references: [id])

  @@map("bundle_components")
}
```

---

### 8. **Tax Configuration**

Flexible tax handling per product.

**Database Schema:**

```prisma
model TaxRate {
  id             Int      @id @default(autoincrement())
  organizationId Int
  name           String   // "VAT 16%", "Zero Rated"
  rate           Float    // 16.0 for 16%
  isDefault      Boolean  @default(false)
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@map("tax_rates")
}

// Add to Product model:
model Product {
  // ... existing fields ...
  taxRateId      Int?
  isTaxable      Boolean  @default(true)
  taxInclusive   Boolean  @default(false)

  taxRate        TaxRate? @relation(fields: [taxRateId], references: [id])
}
```

---

### 9. **Supplier Management for Products**

Track preferred suppliers and purchase history.

**Database Schema:**

```prisma
model ProductSupplier {
  id                Int      @id @default(autoincrement())
  productId         Int
  supplierId        Int
  supplierSKU       String?
  cost              Float?
  minOrderQuantity  Int?
  leadTimeDays      Int?
  isPrimarySupplier Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  supplier          Supplier @relation(fields: [supplierId], references: [id])

  @@unique([productId, supplierId])
  @@map("product_suppliers")
}
```

---

## 🎨 Frontend Modernization

### 1. **Grid & List View Toggle**

Modern interface with multiple view options.

**Features:**

- Grid view (cards with images)
- List view (compact table)
- Compact view (dense list)
- View preference saved per user

### 2. **Advanced Filters Sidebar**

Powerful filtering like e-commerce sites.

**Features:**

- Filter by category (multi-select)
- Filter by tags
- Price range slider
- Stock status (in stock, low stock, out of stock)
- Product type (product vs service)
- Status filter
- Date range (created, updated)
- Custom attribute filters

### 3. **Bulk Operations**

Select multiple products for batch actions.

**Features:**

- Bulk edit (price, category, status)
- Bulk status change
- Bulk tag assignment
- Bulk delete/archive
- Bulk export
- Bulk barcode printing

### 4. **Image Gallery Component**

Modern image upload and management.

**Features:**

- Drag & drop multiple images
- Image cropping
- Reorder images
- Set primary image
- Delete images
- Preview gallery
- Lazy loading

### 5. **Quick View Modal**

View product details without navigation.

**Features:**

- Product overview
- Quick edit
- Stock status
- Price history
- Recent sales
- Related products

### 6. **Enhanced Search**

Smart search with autocomplete.

**Features:**

- Search by name, SKU, barcode
- Search autocomplete
- Recent searches
- Search suggestions
- Filter integration
- Keyboard navigation

### 7. **Product Comparison**

Compare multiple products side-by-side.

**Features:**

- Select up to 5 products
- Side-by-side comparison
- Highlight differences
- Export comparison

### 8. **Status Badges & Indicators**

Visual indicators for product state.

**Features:**

- Status badges (Active, Draft, Discontinued)
- Stock indicators (In Stock, Low Stock, Out of Stock)
- Commission indicator
- New product badge
- Bestseller badge
- Low margin warning

---

## 📊 Enhanced Analytics

### 1. **Product Performance Dashboard**

- Sales by product
- Top performers
- Slow movers
- Profit margins
- Stock turnover ratio

### 2. **Product Value Analytics**

- ✅ Already implemented
- Total inventory value
- Value by category
- Profit potential

### 3. **ABC Analysis**

- A items: Top 20% revenue
- B items: Middle 30% revenue
- C items: Bottom 50% revenue

### 4. **Stock Analysis**

- ✅ Low stock already implemented
- Dead stock (no sales in X days)
- Overstock items
- Expiring soon

---

## 🔄 API Endpoints (Backend)

### Product Endpoints

```typescript
// Existing
GET    /products
POST   /products
GET    /products/:id
PUT    /products/:id
DELETE /products/:id
PATCH  /products/:id/quantity
PATCH  /products/bulk-update-stock
POST   /products/upload (CSV)
GET    /products/search/barcode
GET    /products/analytics/value
GET    /products/analytics/value-by-category
GET    /products/analytics/low-stock

// New Endpoints
POST   /products/:id/duplicate
PATCH  /products/:id/archive
PATCH  /products/:id/restore
PATCH  /products/:id/status
GET    /products/:id/history
GET    /products/:id/variants
POST   /products/:id/variants
PUT    /products/variants/:variantId
DELETE /products/variants/:variantId
GET    /products/:id/images
POST   /products/:id/images
DELETE /products/images/:imageId
PATCH  /products/images/:imageId/primary
POST   /products/:id/tags
DELETE /products/:id/tags/:tagId
GET    /products/:id/suppliers
POST   /products/:id/suppliers
GET    /products/:id/pricing
POST   /products/:id/pricing
GET    /products/:id/bundles
POST   /products/bundles
POST   /products/bulk-edit
GET    /products/analytics/abc-analysis
GET    /products/analytics/dead-stock
GET    /products/analytics/performance
```

---

## 🚀 Implementation Plan

### Phase 1: Database Schema Enhancement (Week 1)

1. ✅ Add ProductVariant model
2. ✅ Add ProductImage model
3. ✅ Add ProductTag & mapping
4. ✅ Add ProductStatus enum
5. ✅ Add PriceTier models
6. ✅ Add UOM models
7. ✅ Add ProductBundle models
8. ✅ Add TaxRate model
9. ✅ Run migrations

### Phase 2: Backend Service Layer (Week 2)

1. Update ProductService with new features
2. Create VariantService
3. Create ImageService
4. Create PricingService
5. Create BundleService
6. Update DTOs for all features
7. Add validation
8. Update controllers

### Phase 3: Frontend UI Components (Week 3)

1. Modernize product list with grid/list views
2. Create advanced filters sidebar
3. Add bulk operations toolbar
4. Create image gallery component
5. Add quick view modal
6. Enhance search with autocomplete
7. Create variant management UI
8. Add status management UI

### Phase 4: Advanced Features (Week 4)

1. Product comparison
2. Enhanced analytics dashboard
3. ABC analysis
4. Product templates
5. Barcode printing
6. Product import templates
7. Product activity timeline
8. Mobile optimization

---

## 💡 Best Practices Implemented

1. **Performance:**
   - Redis caching for frequently accessed products
   - Lazy loading for images
   - Pagination for large lists
   - Debounced search
   - Virtual scrolling for large datasets

2. **User Experience:**
   - Loading states
   - Error handling
   - Toast notifications
   - Confirmation dialogs
   - Keyboard shortcuts
   - Responsive design

3. **Data Integrity:**
   - Transaction support
   - Audit trails
   - Soft deletes (archive)
   - Data validation
   - Cascade deletes on relations

4. **Security:**
   - Permission checks
   - Organization isolation
   - Input sanitization
   - Rate limiting

5. **Scalability:**
   - Indexed database fields
   - Efficient queries
   - Batch operations
   - Background jobs for heavy operations

---

## 📱 Mobile Considerations

- Touch-friendly UI
- Swipe actions
- Mobile-optimized forms
- Camera integration for barcode scanning
- Offline mode support
- Push notifications for low stock

---

## 🔍 Search & Discovery

- Full-text search
- Fuzzy matching
- Search history
- Saved searches
- Advanced query builder
- Export search results

---

This modernization transforms Lumina ERP's product management into a world-class system comparable to leading POS and ERP solutions while maintaining the existing inventory batch tracking and commission features.
