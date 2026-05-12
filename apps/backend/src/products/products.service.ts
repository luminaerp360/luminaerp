import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProductDto } from './product.dto';
import * as XLSX from 'xlsx';

export interface RawProductData {
  name?: string;
  description?: string;
  price?: number | string;
  buyingPrice?: number | string;
  wholesalePrice?: number | string;
  quantity?: number | string;
  storeQuantity?: number | string;
  reorderLevel?: number | string;
  categoryName?: string;
  categoryId?: number | string;
  productIdNumber?: string;
  pictureUrl?: string;
  countable?: boolean | string;
  isService?: boolean | string;
  availability?: boolean | string;
  expiryDate?: Date | string | number;
  [key: string]: any; // Allow additional properties
}

export interface UploadError {
  row: number;
  product: RawProductData;
  errors: string[];
  severity: 'warning' | 'error';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SkippedProduct {
  row: number;
  product: RawProductData;
  existingProductId: number;
  reason: string;
  existingProductData?: {
    id: number;
    name: string;
    productIdNumber: string;
  };
}

export interface CreatedProduct {
  rowNumber: number;
  originalData: RawProductData;
  [key: string]: any; // Include all product properties
}

@Injectable()
export class ProductService {
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly CACHE_PREFIX = 'product:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createProduct(organizationId: number, dto: ProductDto) {
    // First, look up the category by name if categoryName is provided
    let categoryId = dto.categoryId;

    // Only generate a product ID if one isn't provided
    if (!dto.productIdNumber) {
      dto.productIdNumber =
        await this.generateUniqueProductCode(organizationId);
    }

    if (dto.categoryName && !dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          name: dto.categoryName,
          organizationId,
        },
      });

      if (!category) {
        // Create a new category if it doesn't exist
        const newCategory = await this.prisma.category.create({
          data: {
            name: dto.categoryName,
            description: `Category for ${dto.categoryName}`,
            organizationId,
          },
        });
        categoryId = newCategory.id;
      } else {
        categoryId = category.id;
      }
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        price: dto.price ?? 0,
        buyingPrice: dto.buyingPrice ?? 0,
        wholesalePrice: dto.wholesalePrice ?? 0,
        description: dto.description,
        productIdNumber: dto.productIdNumber,
        reorderLevel: dto.reorderLevel,
        pictureUrl: dto.pictureUrl,
        availability: dto.availability,
        quantity: dto.quantity,
        storeQuantity: dto.storeQuantity,
        expiryDate: dto.expiryDate,
        countable: dto.countable,
        isService: dto.isService,
        // Commission fields
        isCommissionable: dto.isCommissionable ?? true,
        defaultCommissionType: dto.defaultCommissionType ?? 'PERCENTAGE',
        defaultCommissionValue: dto.defaultCommissionValue ?? 0,
        ...(dto.trackingMode
          ? ({ trackingMode: dto.trackingMode } as any)
          : {}),
        ...(dto.requiresUniqueIdentifiers !== undefined
          ? ({
              requiresUniqueIdentifiers: dto.requiresUniqueIdentifiers,
            } as any)
          : {}),
        ...(dto.requiredAssetTypes
          ? ({ requiredAssetTypes: dto.requiredAssetTypes } as any)
          : {}),
        batchTracking: dto.batchTracking ?? false,
        organization: {
          connect: {
            id: organizationId,
          },
        },
        category: {
          connect: {
            id: categoryId,
            organizationId, // Ensure category belongs to same organization
          },
        },
      },
    });

    // Invalidate cache after creating product
    await this.invalidateCache(organizationId);

    return product;
  }

  async getAllProducts(organizationId: number) {
    const cacheKey = `${this.CACHE_PREFIX}all:${organizationId}`;

    // Try to get from cache
    const cachedProducts = await this.redis.get(cacheKey);
    if (cachedProducts) {
      return cachedProducts;
    }

    // If not in cache, fetch from database
    const products = await this.prisma.product.findMany({
      where: { organizationId },
      include: {
        category: true,
      },
    });

    // Store in cache
    await this.redis.set(cacheKey, products, this.CACHE_TTL);

    return products;
  }

  async exportProductsToExcel(organizationId: number): Promise<Buffer> {
    // Get all products for the organization
    const products = await this.prisma.product.findMany({
      where: { organizationId },
      include: {
        category: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Prepare data for Excel
    const excelData = products.map((product, index) => ({
      'S/N': index + 1,
      'Product ID': product.productIdNumber,
      'Product Name': product.name,
      Description: product.description || '',
      Category: product.category.name,
      'Selling Price': product.price || 0,
      'Buying Price': product.buyingPrice || 0,
      'Wholesale Price': product.wholesalePrice || 0,
      Quantity: product.quantity || 0,
      'Store Quantity': product.storeQuantity || 0,
      'Reorder Level': product.reorderLevel || 0,
      'Is Service': product.isService ? 'Yes' : 'No',
      'Is Countable': product.countable ? 'Yes' : 'No',
      Available: product.availability ? 'Yes' : 'No',
      'Expiry Date': product.expiryDate
        ? product.expiryDate.toISOString().split('T')[0]
        : '',
      'Picture URL': product.pictureUrl || '',
      'Created At': product.createdAt.toISOString().split('T')[0],
      'Updated At': product.updatedAt.toISOString().split('T')[0],
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 5 }, // S/N
      { wch: 15 }, // Product ID
      { wch: 25 }, // Product Name
      { wch: 30 }, // Description
      { wch: 15 }, // Category
      { wch: 12 }, // Selling Price
      { wch: 12 }, // Buying Price
      { wch: 12 }, // Wholesale Price
      { wch: 10 }, // Quantity
      { wch: 12 }, // Store Quantity
      { wch: 12 }, // Reorder Level
      { wch: 10 }, // Is Service
      { wch: 12 }, // Is Countable
      { wch: 10 }, // Available
      { wch: 12 }, // Expiry Date
      { wch: 20 }, // Picture URL
      { wch: 12 }, // Created At
      { wch: 12 }, // Updated At
    ];

    worksheet['!cols'] = columnWidths;

    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  async getProductById(organizationId: number, id: number) {
    const cacheKey = `${this.CACHE_PREFIX}${organizationId}:${id}`;

    // Try to get from cache
    const cachedProduct = await this.redis.get(cacheKey);
    if (cachedProduct) {
      return cachedProduct;
    }

    // If not in cache, fetch from database
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found in this organization`,
      );
    }

    // Store in cache
    await this.redis.set(cacheKey, product, this.CACHE_TTL);

    return product;
  }

  async findProductByBarcode(organizationId: number, barcode: string) {
    const cacheKey = `${this.CACHE_PREFIX}barcode:${organizationId}:${barcode}`;

    // Try to get from cache
    const cachedProduct = await this.redis.get(cacheKey);
    if (cachedProduct) {
      return cachedProduct;
    }

    // If not in cache, fetch from database
    const product = await this.prisma.product.findFirst({
      where: {
        productIdNumber: barcode,
        organizationId,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with barcode ${barcode} not found in this organization`,
      );
    }

    // Store in cache
    await this.redis.set(cacheKey, product, this.CACHE_TTL);

    return product;
  }

  async updateProduct(organizationId: number, id: number, dto: ProductDto) {
    // Fetch from database directly to avoid type issues with cache
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        category: true,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException(
        `Product with ID ${id} not found in this organization`,
      );
    }

    // Handle category update by name if provided
    let categoryData = undefined;

    if (dto.categoryName) {
      const category = await this.prisma.category.findFirst({
        where: {
          name: dto.categoryName,
          organizationId,
        },
      });

      if (!category) {
        // Create a new category if it doesn't exist
        const newCategory = await this.prisma.category.create({
          data: {
            name: dto.categoryName,
            description: `Category for ${dto.categoryName}`,
            organizationId,
          },
        });
        categoryData = {
          connect: {
            id: newCategory.id,
            organizationId,
          },
        };
      } else {
        categoryData = {
          connect: {
            id: category.id,
            organizationId,
          },
        };
      }
    } else if (dto.categoryId) {
      categoryData = {
        connect: {
          id: dto.categoryId,
          organizationId,
        },
      };
    }

    const existingProductAny: any = existingProduct;

    const updatedProduct = await this.prisma.product.update({
      where: {
        id,
        organizationId,
      },
      data: {
        name: dto.name ?? existingProduct.name,
        price: dto.price ?? existingProduct.price,
        buyingPrice: dto.buyingPrice ?? existingProduct.buyingPrice,
        wholesalePrice: dto.wholesalePrice ?? existingProduct.wholesalePrice,
        description: dto.description ?? existingProduct.description,
        productIdNumber: dto.productIdNumber ?? existingProduct.productIdNumber,
        reorderLevel: dto.reorderLevel ?? existingProduct.reorderLevel,
        storeQuantity: dto.storeQuantity ?? existingProduct.storeQuantity,
        expiryDate: dto.expiryDate ?? existingProduct.expiryDate,
        pictureUrl: dto.pictureUrl ?? existingProduct.pictureUrl,
        availability: dto.availability ?? existingProduct.availability,
        quantity: dto.quantity ?? existingProduct.quantity,
        countable: dto.countable ?? existingProduct.countable,
        isService: dto.isService ?? existingProduct.isService,
        // Commission fields
        isCommissionable:
          dto.isCommissionable ?? existingProduct.isCommissionable,
        defaultCommissionType:
          dto.defaultCommissionType ?? existingProduct.defaultCommissionType,
        defaultCommissionValue:
          dto.defaultCommissionValue ?? existingProduct.defaultCommissionValue,
        ...(dto.trackingMode !== undefined
          ? ({ trackingMode: dto.trackingMode } as any)
          : existingProductAny.trackingMode !== undefined
            ? ({ trackingMode: existingProductAny.trackingMode } as any)
            : {}),
        ...(dto.requiresUniqueIdentifiers !== undefined
          ? ({
              requiresUniqueIdentifiers: dto.requiresUniqueIdentifiers,
            } as any)
          : existingProductAny.requiresUniqueIdentifiers !== undefined
            ? ({
                requiresUniqueIdentifiers:
                  existingProductAny.requiresUniqueIdentifiers,
              } as any)
            : {}),
        ...(dto.requiredAssetTypes !== undefined
          ? ({ requiredAssetTypes: dto.requiredAssetTypes } as any)
          : existingProductAny.requiredAssetTypes !== undefined
            ? ({
                requiredAssetTypes: existingProductAny.requiredAssetTypes,
              } as any)
            : {}),
        batchTracking: dto.batchTracking ?? existingProduct.batchTracking,
        category: categoryData,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache after updating product
    await this.invalidateCache(organizationId, id);

    return updatedProduct;
  }

  async updateProductQuantity(
    organizationId: number,
    id: number | string,
    quantity: number,
  ) {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;

    // Fetch from database directly to avoid type issues with cache
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id: numericId,
        organizationId,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException(
        `Product with ID ${numericId} not found in this organization`,
      );
    }
    const updatedProduct = await this.prisma.product.update({
      where: { id: numericId }, // Use numericId here
      data: {
        quantity: quantity + existingProduct.quantity,
      },
    });

    // Invalidate cache after updating quantity
    await this.invalidateCache(organizationId, numericId);

    return updatedProduct;
  }

  async updateProductQuantityAdded(
    organizationId: number,
    id: number,
    quantity: number,
  ) {
    // Fetch from database directly to avoid type issues with cache
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException(
        `Product with ID ${id} not found in this organization`,
      );
    }

    const updatedProduct = await this.prisma.product.update({
      where: {
        id,
        organizationId,
      },
      data: {
        quantity,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache after updating quantity
    await this.invalidateCache(organizationId, id);

    return updatedProduct;
  }

  async deleteProduct(organizationId: number, id: number) {
    // Check if product exists
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingProduct) {
      throw new NotFoundException(
        `Product with ID ${id} not found in this organization`,
      );
    }

    const deletedProduct = await this.prisma.product.delete({
      where: {
        id,
        organizationId,
      },
    });

    // Invalidate cache after deleting product
    await this.invalidateCache(organizationId, id);

    return deletedProduct;
  }

  async getProductUnits(
    organizationId: number,
    productId: number,
    options?: {
      status?: 'IN_STOCK' | 'RESERVED' | 'SOLD';
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
  ) {
    await this.ensureProductExists(organizationId, productId);

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      productId,
    };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        where.createdAt.lte = new Date(options.endDate);
      }
    }

    if (options?.search) {
      where.identifierValue = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      (this.prisma as any).productUnit.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: limit,
        include: {
          order: {
            select: { id: true, receiptNumber: true, createdAt: true },
          },
        },
      }),
      (this.prisma as any).productUnit.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnitHistory(
    organizationId: number,
    productId: number,
    unitId: number,
  ) {
    await this.ensureProductExists(organizationId, productId);

    const unit = await (this.prisma as any).productUnit.findFirst({
      where: { id: unitId, organizationId, productId },
      include: {
        order: {
          select: {
            id: true,
            receiptNumber: true,
            createdAt: true,
            total: true,
            customer_name: true,
          },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    // Get all sold links (sale records) for this unit
    const soldLinks = await (this.prisma as any).orderSoldUnit.findMany({
      where: { productUnitId: unitId, organizationId },
      include: {
        order: {
          select: {
            id: true,
            receiptNumber: true,
            createdAt: true,
            total: true,
            customer_name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build timeline events
    const timeline: any[] = [];

    // 1. Created / received event
    timeline.push({
      event: 'CREATED',
      date: unit.createdAt,
      details: {
        identifierValue: unit.identifierValue,
        source: unit.metadata?.source || 'MANUAL',
        ...(unit.metadata?.supplierId
          ? { supplierId: unit.metadata.supplierId }
          : {}),
        ...(unit.metadata?.inventoryId
          ? { inventoryId: unit.metadata.inventoryId }
          : {}),
      },
    });

    // 2. Sale events
    for (const link of soldLinks) {
      timeline.push({
        event: 'SOLD',
        date: link.createdAt,
        details: {
          orderId: link.order?.id,
          receiptNumber: link.order?.receiptNumber,
          customerName: link.order?.customer_name,
          totalAmount: link.order?.total,
        },
      });
    }

    // Sort by date
    timeline.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return {
      unit,
      timeline,
    };
  }

  async bulkCreateProductUnits(
    organizationId: number,
    productId: number,
    identifiers: string[],
    metadata?: Record<string, any>,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        trackingMode: true,
        isService: true,
      },
    });

    const trackingMode = (product as any)?.trackingMode ?? 'NONE';

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.isService) {
      throw new BadRequestException('Services cannot have tracked units');
    }

    if (trackingMode === 'NONE') {
      throw new BadRequestException(
        'Set product tracking mode first before adding units',
      );
    }

    const cleanedIdentifiers = identifiers
      .map((value) => String(value || '').trim())
      .filter((value) => value.length > 0);

    if (cleanedIdentifiers.length === 0) {
      throw new BadRequestException('No valid identifiers provided');
    }

    const duplicatesInRequest = cleanedIdentifiers.filter(
      (value, index) => cleanedIdentifiers.indexOf(value) !== index,
    );
    if (duplicatesInRequest.length > 0) {
      throw new BadRequestException(
        `Duplicate identifiers provided: ${[...new Set(duplicatesInRequest)].join(', ')}`,
      );
    }

    const existing = await (this.prisma as any).productUnit.findMany({
      where: {
        organizationId,
        identifierValue: {
          in: cleanedIdentifiers,
        },
      },
      select: {
        identifierValue: true,
      },
    });

    if (existing.length > 0) {
      throw new BadRequestException(
        `These identifiers already exist: ${existing.map((i) => i.identifierValue).join(', ')}`,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const rows = [];
      for (const identifier of cleanedIdentifiers) {
        const unit = await (tx as any).productUnit.create({
          data: {
            organizationId,
            productId,
            identifierType: trackingMode,
            identifierValue: identifier,
            metadata: metadata ?? null,
          },
        });
        rows.push(unit);
      }

      await tx.product.update({
        where: { id: productId },
        data: {
          quantity: {
            increment: rows.length,
          },
        },
      });

      return rows;
    });

    await this.invalidateCache(organizationId, productId);

    return {
      message: `Created ${created.length} tracked units for ${product.name}`,
      units: created,
    };
  }

  async createProductAsset(
    organizationId: number,
    productId: number,
    payload: {
      fileUrl: string;
      fileName?: string;
      mimeType?: string;
      assetType?:
        | 'IMAGE'
        | 'DOCUMENT'
        | 'LOGBOOK'
        | 'INSURANCE'
        | 'WARRANTY'
        | 'OTHER';
      productUnitId?: number;
      uploadedBy?: number;
    },
  ) {
    await this.ensureProductExists(organizationId, productId);

    if (!payload.fileUrl || payload.fileUrl.trim() === '') {
      throw new BadRequestException('fileUrl is required');
    }

    if (payload.productUnitId) {
      const unit = await (this.prisma as any).productUnit.findFirst({
        where: {
          id: payload.productUnitId,
          organizationId,
          productId,
        },
      });

      if (!unit) {
        throw new BadRequestException('Invalid productUnitId for this product');
      }
    }

    return (this.prisma as any).productAsset.create({
      data: {
        organizationId,
        productId,
        productUnitId: payload.productUnitId,
        assetType: payload.assetType ?? 'DOCUMENT',
        fileUrl: payload.fileUrl,
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        uploadedBy: payload.uploadedBy,
      },
    });
  }

  async uploadProductsFromExcel(organizationId: number, file: any) {
    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      if (!file.buffer) {
        throw new Error('Invalid file format');
      }

      const workbook = XLSX.read(file.buffer, {
        type: 'buffer',
        cellDates: true,
      });

      if (!workbook.SheetNames.length) {
        throw new Error('Excel file contains no sheets');
      }

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Type the raw products array properly
      const rawProducts = XLSX.utils.sheet_to_json(
        worksheet,
      ) as RawProductData[];

      if (!rawProducts.length) {
        throw new Error('Excel file contains no data rows');
      }

      const createdProducts: CreatedProduct[] = [];
      const skippedProducts: SkippedProduct[] = [];
      const errors: UploadError[] = [];
      const validationErrors: UploadError[] = [];

      console.log(`Processing ${rawProducts.length} products from Excel...`);

      for (let index = 0; index < rawProducts.length; index++) {
        const rawProduct = rawProducts[index];
        const rowNumber = index + 2; // Excel row number (accounting for header)

        try {
          // Step 1: Validate required fields and data integrity
          const validation = this.validateProductRow(rawProduct, rowNumber);

          if (!validation.isValid) {
            validationErrors.push({
              row: rowNumber,
              product: rawProduct,
              errors: validation.errors,
              severity: 'error',
            });
            continue; // Skip this product due to validation errors
          }

          // Add warnings if any
          if (validation.warnings.length > 0) {
            errors.push({
              row: rowNumber,
              product: rawProduct,
              errors: validation.warnings,
              severity: 'warning',
            });
          }

          // Step 2: Check for duplicate products
          const productName = String(rawProduct.name || '').trim();
          const productIdNumber = rawProduct.productIdNumber
            ? String(rawProduct.productIdNumber).trim()
            : null;

          // Check for existing product by name
          const existingProductByName = await this.prisma.product.findFirst({
            where: {
              organizationId,
              name: productName,
            },
          });

          if (existingProductByName) {
            skippedProducts.push({
              row: rowNumber,
              product: rawProduct,
              existingProductId: existingProductByName.id,
              reason: `Product with name "${productName}" already exists`,
              existingProductData: {
                id: existingProductByName.id,
                name: existingProductByName.name,
                productIdNumber: existingProductByName.productIdNumber,
              },
            });
            continue;
          }

          // Check for existing product by productIdNumber if provided
          if (productIdNumber) {
            const existingProductByCode = await this.prisma.product.findFirst({
              where: {
                organizationId,
                productIdNumber: productIdNumber,
              },
            });

            if (existingProductByCode) {
              skippedProducts.push({
                row: rowNumber,
                product: rawProduct,
                existingProductId: existingProductByCode.id,
                reason: `Product with ID "${productIdNumber}" already exists`,
                existingProductData: {
                  id: existingProductByCode.id,
                  name: existingProductByCode.name,
                  productIdNumber: existingProductByCode.productIdNumber,
                },
              });
              continue;
            }
          }

          // Step 3: Format and create the product
          const uniqueProductId =
            await this.generateUniqueProductCode(organizationId);
          const formattedProduct = await this.formatProductForImport(
            rawProduct,
            organizationId,
          );

          // Override with generated ID if none provided
          if (!formattedProduct.productIdNumber) {
            formattedProduct.productIdNumber = uniqueProductId;
          }

          const createdProduct = await this.createProduct(
            organizationId,
            formattedProduct,
          );
          createdProducts.push({
            ...createdProduct,
            rowNumber,
            originalData: rawProduct,
          });

          console.log(
            `✓ Successfully created product: ${productName} (Row ${rowNumber})`,
          );
        } catch (error) {
          console.error(
            `✗ Error processing product at row ${rowNumber}:`,
            error,
          );

          errors.push({
            row: rowNumber,
            product: rawProduct,
            errors: [this.getDetailedErrorMessage(error, rawProduct)],
            severity: 'error',
          });
        }
      }

      // Combine validation errors with processing errors
      const allErrors = [...validationErrors, ...errors];

      // Generate summary
      const summary = {
        totalRows: rawProducts.length,
        successful: createdProducts.length,
        skipped: skippedProducts.length,
        failed: allErrors.filter((e) => e.severity === 'error').length,
        warnings: allErrors.filter((e) => e.severity === 'warning').length,
      };

      console.log('Upload Summary:', summary);

      return {
        success: true,
        summary,
        results: {
          created: createdProducts,
          skipped: skippedProducts,
          errors: allErrors,
        },
        message: this.generateUploadSummaryMessage(summary),
      };
    } catch (error) {
      console.error('Excel upload failed:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Update the validation method with proper typing
  private validateProductRow(
    rawProduct: RawProductData,
    rowNumber: number,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if the row is completely empty
    if (!rawProduct || Object.keys(rawProduct).length === 0) {
      errors.push('Row is completely empty');
      return { isValid: false, errors, warnings };
    }

    // Required field validations
    const requiredFields = [
      {
        field: 'name' as keyof RawProductData,
        message: 'Product name is required',
      },
    ];

    requiredFields.forEach(({ field, message }) => {
      const value = rawProduct[field];
      if (!value || String(value).trim() === '') {
        errors.push(message);
      }
    });

    // Data type and format validations
    if (rawProduct.name && String(rawProduct.name).trim().length < 2) {
      errors.push('Product name must be at least 2 characters long');
    }

    if (rawProduct.name && String(rawProduct.name).trim().length > 255) {
      errors.push('Product name cannot exceed 255 characters');
    }

    // Price validations
    if (this.hasValue(rawProduct.price)) {
      const price = Number(rawProduct.price);
      if (isNaN(price)) {
        errors.push('Price must be a valid number');
      } else if (price < 0) {
        errors.push('Price cannot be negative');
      } else if (price > 999999999) {
        errors.push('Price value is too large');
      }
    }

    // Buying price validations
    if (this.hasValue(rawProduct.buyingPrice)) {
      const buyingPrice = Number(rawProduct.buyingPrice);
      if (isNaN(buyingPrice)) {
        errors.push('Buying price must be a valid number');
      } else if (buyingPrice < 0) {
        errors.push('Buying price cannot be negative');
      } else if (buyingPrice > 999999999) {
        errors.push('Buying price value is too large');
      }
    }

    // Quantity validations
    if (this.hasValue(rawProduct.quantity)) {
      const quantity = Number(rawProduct.quantity);
      if (isNaN(quantity)) {
        errors.push('Quantity must be a valid number');
      } else if (quantity < 0) {
        errors.push('Quantity cannot be negative');
      } else if (!Number.isInteger(quantity)) {
        warnings.push(
          'Quantity should be a whole number, decimal will be rounded',
        );
      }
    }

    // Reorder level validations
    if (this.hasValue(rawProduct.reorderLevel)) {
      const reorderLevel = Number(rawProduct.reorderLevel);
      if (isNaN(reorderLevel)) {
        errors.push('Reorder level must be a valid number');
      } else if (reorderLevel < 0) {
        errors.push('Reorder level cannot be negative');
      } else if (!Number.isInteger(reorderLevel)) {
        warnings.push(
          'Reorder level should be a whole number, decimal will be rounded',
        );
      }
    }

    // Store quantity validations
    if (this.hasValue(rawProduct.storeQuantity)) {
      const storeQuantity = Number(rawProduct.storeQuantity);
      if (isNaN(storeQuantity)) {
        errors.push('Store quantity must be a valid number');
      } else if (storeQuantity < 0) {
        errors.push('Store quantity cannot be negative');
      } else if (!Number.isInteger(storeQuantity)) {
        warnings.push(
          'Store quantity should be a whole number, decimal will be rounded',
        );
      }
    }

    // Date validations
    if (rawProduct.expiryDate && rawProduct.expiryDate !== '') {
      try {
        if (typeof rawProduct.expiryDate === 'string') {
          const date = new Date(rawProduct.expiryDate);
          if (isNaN(date.getTime())) {
            errors.push('Expiry date format is invalid');
          } else if (date < new Date()) {
            warnings.push('Expiry date is in the past');
          }
        }
      } catch {
        errors.push('Expiry date format is invalid');
      }
    }

    // Boolean field validations
    const booleanFields: (keyof RawProductData)[] = [
      'countable',
      'isService',
      'availability',
    ];
    booleanFields.forEach((field) => {
      if (this.hasValue(rawProduct[field])) {
        const value = String(rawProduct[field]).toLowerCase().trim();
        const validBooleanValues = ['true', 'false', 'yes', 'no', '1', '0'];
        if (!validBooleanValues.includes(value)) {
          warnings.push(
            `${String(field)} should be true/false, yes/no, or 1/0`,
          );
        }
      }
    });

    // Category validations
    if (!rawProduct.categoryName && !rawProduct.categoryId) {
      warnings.push(
        'Neither category name nor category ID provided, product will use default category',
      );
    }

    if (
      rawProduct.categoryName &&
      String(rawProduct.categoryName).trim().length > 100
    ) {
      errors.push('Category name cannot exceed 100 characters');
    }

    // URL validations
    if (rawProduct.pictureUrl && rawProduct.pictureUrl !== '') {
      try {
        new URL(String(rawProduct.pictureUrl));
      } catch {
        warnings.push('Picture URL format appears invalid');
      }
    }

    // Product ID number validation
    if (
      rawProduct.productIdNumber &&
      String(rawProduct.productIdNumber).trim().length > 50
    ) {
      errors.push('Product ID number cannot exceed 50 characters');
    }

    // Business logic validations
    if (rawProduct.price && rawProduct.buyingPrice) {
      const price = Number(rawProduct.price);
      const buyingPrice = Number(rawProduct.buyingPrice);
      if (!isNaN(price) && !isNaN(buyingPrice) && price < buyingPrice) {
        warnings.push(
          'Selling price is lower than buying price - this will result in a loss',
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Add this helper method to check if a value exists and is not empty
  private hasValue(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  // Update the error message method with proper typing
  private getDetailedErrorMessage(
    error: any,
    rawProduct: RawProductData,
  ): string {
    const productName = rawProduct?.name || 'Unknown Product';

    if (error.code === 'P2002') {
      // Prisma unique constraint violation
      if (error.meta?.target?.includes('name')) {
        return `Duplicate product name "${productName}" - product already exists`;
      }
      if (error.meta?.target?.includes('productIdNumber')) {
        return `Duplicate product ID "${rawProduct?.productIdNumber}" - ID already exists`;
      }
      return `Duplicate entry detected for product "${productName}"`;
    }

    if (error.code === 'P2003') {
      // Foreign key constraint violation
      return `Invalid category reference for product "${productName}"`;
    }

    if (error.message?.includes('categoryId')) {
      return `Invalid category ID for product "${productName}"`;
    }

    if (error.message?.includes('organizationId')) {
      return `Organization access error for product "${productName}"`;
    }

    // Generic error with product context
    return `Failed to create product "${productName}": ${error.message}`;
  }

  // Update the formatProductForImport method signature
  private async formatProductForImport(
    rawProduct: RawProductData,
    organizationId: number,
  ): Promise<ProductDto> {
    const product: ProductDto = {
      name: String(rawProduct.name || ''),
      // Generate a product code if one isn't provided or is empty
      productIdNumber:
        rawProduct.productIdNumber &&
        String(rawProduct.productIdNumber).trim() !== ''
          ? String(rawProduct.productIdNumber)
          : await this.generateUniqueProductCode(organizationId),
      price:
        typeof rawProduct.price === 'number'
          ? rawProduct.price
          : parseFloat(String(rawProduct.price)) || 0,
      buyingPrice:
        typeof rawProduct.buyingPrice === 'number'
          ? rawProduct.buyingPrice
          : parseFloat(String(rawProduct.buyingPrice)) || 0,
      wholesalePrice:
        typeof rawProduct.wholesalePrice === 'number'
          ? rawProduct.wholesalePrice
          : parseFloat(String(rawProduct.wholesalePrice)) || 0,
      reorderLevel:
        typeof rawProduct.reorderLevel === 'number'
          ? rawProduct.reorderLevel
          : parseInt(String(rawProduct.reorderLevel)) || 0,
      quantity:
        typeof rawProduct.quantity === 'number'
          ? rawProduct.quantity
          : parseInt(String(rawProduct.quantity)) || 0,
      storeQuantity:
        typeof rawProduct.storeQuantity === 'number'
          ? rawProduct.storeQuantity
          : parseInt(String(rawProduct.storeQuantity)) || 0,
      categoryName: rawProduct.categoryName
        ? String(rawProduct.categoryName)
        : undefined,
      categoryId: rawProduct.categoryId
        ? parseInt(String(rawProduct.categoryId))
        : undefined,
      description: rawProduct.description
        ? String(rawProduct.description)
        : undefined,
      pictureUrl: rawProduct.pictureUrl
        ? String(rawProduct.pictureUrl)
        : undefined,
      countable: this.parseBoolean(rawProduct.countable, true),
      isService: this.parseBoolean(rawProduct.isService, false),
      availability: this.parseBoolean(rawProduct.availability, true),
    };

    // Handle the expiry date conversion properly
    if (rawProduct.expiryDate) {
      // Check if it's already a Date object (from XLSX with cellDates: true)
      if (rawProduct.expiryDate instanceof Date) {
        product.expiryDate = rawProduct.expiryDate;
      }
      // Check if it's an Excel date number
      else if (typeof rawProduct.expiryDate === 'number') {
        // Convert Excel date number to JavaScript Date
        product.expiryDate = this.excelDateToJSDate(rawProduct.expiryDate);
      }
      // Check if it's a string date format
      else if (
        typeof rawProduct.expiryDate === 'string' &&
        rawProduct.expiryDate.trim() !== ''
      ) {
        product.expiryDate = new Date(rawProduct.expiryDate);
      }
    }

    return product;
  }

  // Update the summary message method with proper typing
  private generateUploadSummaryMessage(summary: {
    totalRows: number;
    successful: number;
    skipped: number;
    failed: number;
    warnings: number;
  }): string {
    const messages: string[] = [];

    if (summary.successful > 0) {
      messages.push(`${summary.successful} products created successfully`);
    }

    if (summary.skipped > 0) {
      messages.push(`${summary.skipped} products skipped (duplicates)`);
    }

    if (summary.failed > 0) {
      messages.push(`${summary.failed} products failed due to errors`);
    }

    if (summary.warnings > 0) {
      messages.push(`${summary.warnings} products created with warnings`);
    }

    return messages.join(', ');
  }

  async getProductsValue(organizationId: number) {
    const products = await this.prisma.product.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        price: true,
        buyingPrice: true,
        quantity: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    let totalBuyingValue = 0;
    let totalSellingValue = 0;
    let productCount = 0;
    let totalQuantity = 0;

    const productValues = products.map((product) => {
      const quantity = product.quantity || 0;
      const buyingPrice = product.buyingPrice || 0;
      const sellingPrice = product.price || 0;

      const productBuyingValue = buyingPrice * quantity;
      const productSellingValue = sellingPrice * quantity;
      const productPotentialProfit = productSellingValue - productBuyingValue;
      const productProfitMargin =
        buyingPrice > 0
          ? ((sellingPrice - buyingPrice) / buyingPrice) * 100
          : 0;

      // Add to totals
      totalBuyingValue += productBuyingValue;
      totalSellingValue += productSellingValue;
      totalQuantity += quantity;

      return {
        id: product.id,
        name: product.name,
        category: product.category.name,
        quantity,
        buyingPrice,
        sellingPrice,
        buyingValue: productBuyingValue,
        sellingValue: productSellingValue,
        potentialProfit: productPotentialProfit,
        profitMargin: Number(productProfitMargin.toFixed(2)),
      };
    });

    productCount = products.length;
    const totalPotentialProfit = totalSellingValue - totalBuyingValue;
    const overallProfitMargin =
      totalBuyingValue > 0
        ? (totalPotentialProfit / totalBuyingValue) * 100
        : 0;

    return {
      summary: {
        productCount,
        totalQuantity,
        totalBuyingValue: Number(totalBuyingValue.toFixed(2)),
        totalSellingValue: Number(totalSellingValue.toFixed(2)),
        totalPotentialProfit: Number(totalPotentialProfit.toFixed(2)),
        overallProfitMargin: Number(overallProfitMargin.toFixed(2)),
      },
      products: productValues,
    };
  }

  // Add this method to get value by category
  async getProductsValueByCategory(organizationId: number) {
    const products = await this.prisma.product.findMany({
      where: { organizationId },
      include: {
        category: true,
      },
    });

    const categoryValues = {};

    products.forEach((product) => {
      const categoryName = product.category.name;
      const quantity = product.quantity || 0;
      const buyingPrice = product.buyingPrice || 0;
      const sellingPrice = product.price || 0;

      const productBuyingValue = buyingPrice * quantity;
      const productSellingValue = sellingPrice * quantity;

      if (!categoryValues[categoryName]) {
        categoryValues[categoryName] = {
          categoryName,
          productCount: 0,
          totalQuantity: 0,
          totalBuyingValue: 0,
          totalSellingValue: 0,
          totalPotentialProfit: 0,
          profitMargin: 0,
        };
      }

      categoryValues[categoryName].productCount += 1;
      categoryValues[categoryName].totalQuantity += quantity;
      categoryValues[categoryName].totalBuyingValue += productBuyingValue;
      categoryValues[categoryName].totalSellingValue += productSellingValue;
    });

    // Calculate profit margins for each category
    Object.keys(categoryValues).forEach((categoryName) => {
      const category = categoryValues[categoryName];
      category.totalPotentialProfit =
        category.totalSellingValue - category.totalBuyingValue;
      category.profitMargin =
        category.totalBuyingValue > 0
          ? (category.totalPotentialProfit / category.totalBuyingValue) * 100
          : 0;

      // Round to 2 decimal places
      category.totalBuyingValue = Number(category.totalBuyingValue.toFixed(2));
      category.totalSellingValue = Number(
        category.totalSellingValue.toFixed(2),
      );
      category.totalPotentialProfit = Number(
        category.totalPotentialProfit.toFixed(2),
      );
      category.profitMargin = Number(category.profitMargin.toFixed(2));
    });

    return Object.values(categoryValues);
  }

  async getLowStockProducts(organizationId: number) {
    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        countable: true, // Only check countable products
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const lowStockProducts = products.filter((product) => {
      const quantity = product.quantity || 0;
      const reorderLevel = product.reorderLevel || 0;

      return reorderLevel > 0 && quantity <= reorderLevel;
    });

    const criticalStockProducts = products.filter((product) => {
      const quantity = product.quantity || 0;
      return quantity === 0;
    });

    const lowStockValue = lowStockProducts.reduce((total, product) => {
      const buyingValue = (product.buyingPrice || 0) * (product.quantity || 0);
      return total + buyingValue;
    }, 0);

    return {
      summary: {
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: criticalStockProducts.length,
        lowStockValue: Number(lowStockValue.toFixed(2)),
      },
      lowStockProducts: lowStockProducts.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category.name,
        currentQuantity: product.quantity || 0,
        reorderLevel: product.reorderLevel || 0,
        buyingPrice: product.buyingPrice || 0,
        sellingPrice: product.price || 0,
        stockValue: (product.buyingPrice || 0) * (product.quantity || 0),
        status: (product.quantity || 0) === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      })),
      outOfStockProducts: criticalStockProducts.map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category.name,
        reorderLevel: product.reorderLevel || 0,
        buyingPrice: product.buyingPrice || 0,
        sellingPrice: product.price || 0,
      })),
    };
  }

  private parseBoolean(value: any, defaultValue: boolean = false): boolean {
    if (value === undefined || value === null) {
      return defaultValue;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      return (
        lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1'
      );
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return defaultValue;
  }

  private excelDateToJSDate(excelDate: number): Date {
    // Excel dates are number of days since 1900-01-01
    // with a couple of quirks (1900 is not a leap year in reality, but Excel thinks it is)
    const millisecondsPerDay = 24 * 60 * 60 * 1000;

    // Excel has a leap year bug where it thinks 1900 was a leap year
    // So we need to adjust dates after Feb 28, 1900
    let daysSince1900 = excelDate;

    // Excel stores dates as days since Jan 1, 1900 (which is day 1, not day 0)
    // JS dates are milliseconds since Jan 1, 1970
    const date = new Date(Date.UTC(1900, 0, 1));
    date.setUTCDate(date.getUTCDate() + Math.floor(daysSince1900) - 2); // -2 for Excel's date system

    // Handle the time portion
    const timePortion = daysSince1900 % 1;
    if (timePortion > 0) {
      const milliseconds = Math.round(timePortion * millisecondsPerDay);
      date.setUTCMilliseconds(date.getUTCMilliseconds() + milliseconds);
    }

    return date;
  }

  // Add to your ProductService class
  async generateUniqueProductCode(organizationId: number): Promise<string> {
    // Get current date components for the prefix
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Create date-based prefix
    const prefix = `${year}${month}${day}`;

    // Count products created today to get a sequence number
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayProductsCount = await this.prisma.product.count({
      where: {
        organizationId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Generate a sequence number padded to 4 digits
    const sequence = (todayProductsCount + 1).toString().padStart(4, '0');

    // Create final product code
    const productCode = `${prefix}-${sequence}`;

    // Ensure the code is unique (in rare cases of conflict)
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        organizationId,
        productIdNumber: productCode,
      },
    });

    if (existingProduct) {
      // Recursively try again with an incremented count
      return this.generateUniqueProductCode(organizationId);
    }

    return productCode;
  }

  // Cache invalidation helper method
  async invalidateCache(
    organizationId: number,
    productId?: number,
  ): Promise<void> {
    // Invalidate the all products cache for the organization
    await this.redis.del(`${this.CACHE_PREFIX}all:${organizationId}`);

    // If productId is provided, invalidate specific product cache
    if (productId) {
      await this.redis.del(
        `${this.CACHE_PREFIX}${organizationId}:${productId}`,
      );
    }

    // Invalidate all barcode caches for the organization
    await this.redis.delPattern(
      `${this.CACHE_PREFIX}barcode:${organizationId}:*`,
    );
  }

  /**
   * Check if product stock is low and send notification
   * Only for non-service products
   */
  async checkAndNotifyLowStock(
    organizationId: number,
    productId: number,
  ): Promise<void> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id: productId, organizationId },
        select: {
          id: true,
          name: true,
          quantity: true,
          reorderLevel: true,
          isService: true,
        },
      });

      if (!product) {
        return;
      }

      // Skip if product is a service
      if (product.isService) {
        return;
      }

      // Skip if no reorder level is set
      if (!product.reorderLevel || product.reorderLevel <= 0) {
        return;
      }

      // Check if stock is at or below reorder level
      if (product.quantity <= product.reorderLevel) {
        await this.notificationsService.createSystemNotification(
          organizationId,
          null, // null = organization-wide notification
          'Low Stock Alert',
          `${product.name} is running low. Current stock: ${product.quantity}, Reorder level: ${product.reorderLevel}`,
          'INVENTORY',
          '/inventory',
          {
            productId: product.id,
            productName: product.name,
            currentStock: product.quantity,
            reorderLevel: product.reorderLevel,
          },
        );

        console.log(
          `Low stock notification sent for product: ${product.name} (${product.quantity}/${product.reorderLevel})`,
        );
      }
    } catch (error) {
      console.error('Error checking/notifying low stock:', error);
      // Don't throw - notification failure shouldn't break the main operation
    }
  }

  /**
   * Batch check and notify for multiple products
   */
  async batchCheckAndNotifyLowStock(
    organizationId: number,
    productIds: number[],
  ): Promise<void> {
    const promises = productIds.map((productId) =>
      this.checkAndNotifyLowStock(organizationId, productId),
    );
    await Promise.allSettled(promises);
  }

  private async ensureProductExists(organizationId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
