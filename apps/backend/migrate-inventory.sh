#!/bin/bash

# Modern Inventory System Migration Script
# This script will create and apply the database migration for the new inventory features

echo "🚀 Starting Modern Inventory System Migration..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if Prisma is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js and npm."
    exit 1
fi

# Format the Prisma schema
echo "📝 Formatting Prisma schema..."
npx prisma format

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Create and apply migration
echo "📦 Creating database migration..."
npx prisma migrate dev --name add_modern_inventory_tracking

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 New tables created:"
    echo "  - inventory_batches"
    echo "  - serial_numbers"
    echo "  - inventory_movements"
    echo "  - warehouse_locations"
    echo "  - reorder_rules"
    echo "  - stock_adjustments"
    echo "  - quality_inspections"
    echo "  - stock_reservations"
    echo "  - inventory_valuations"
    echo ""
    echo "📚 Documentation: See MODERN_INVENTORY_SYSTEM.md for API details"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
