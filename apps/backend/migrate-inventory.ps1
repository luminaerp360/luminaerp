# Modern Inventory System Migration Script for Windows
# Run this in PowerShell

Write-Host "🚀 Starting Modern Inventory System Migration..." -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location $PSScriptRoot

# Check if npx is available
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: npx not found. Please install Node.js and npm." -ForegroundColor Red
    exit 1
}

# Format the Prisma schema
Write-Host "📝 Formatting Prisma schema..." -ForegroundColor Yellow
npx prisma format

# Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Create and apply migration
Write-Host "📦 Creating database migration..." -ForegroundColor Yellow
npx prisma migrate dev --name add_modern_inventory_tracking

# Check if migration was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 New tables created:" -ForegroundColor Cyan
    Write-Host "  - inventory_batches"
    Write-Host "  - serial_numbers"
    Write-Host "  - inventory_movements"
    Write-Host "  - warehouse_locations"
    Write-Host "  - reorder_rules"
    Write-Host "  - stock_adjustments"
    Write-Host "  - quality_inspections"
    Write-Host "  - stock_reservations"
    Write-Host "  - inventory_valuations"
    Write-Host ""
    Write-Host "📚 Documentation: See MODERN_INVENTORY_SYSTEM.md for API details" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Migration failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}
