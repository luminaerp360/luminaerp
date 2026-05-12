import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
  UseGuards,
  Patch,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { ProductService } from './products.service';
import { ProductDto } from './product.dto';
import { JwtGuard } from 'src/auth/guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { GetUser } from 'src/auth/decorator';
import { LogActivity } from '../system-logs/decorators/log-activity.decorator';
import {
  LogAction,
  LogModule,
} from '../system-logs/entities/system-log.entity';

@Controller('organizations/:organizationId/products')
@UseGuards(JwtGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  private static readonly ASSET_UPLOAD_DIR = 'uploads/product-assets';

  private static ensureUploadDir(): string {
    if (!existsSync(ProductController.ASSET_UPLOAD_DIR)) {
      mkdirSync(ProductController.ASSET_UPLOAD_DIR, { recursive: true });
    }
    return ProductController.ASSET_UPLOAD_DIR;
  }

  @Post()
  @LogActivity({
    action: LogAction.CREATE,
    module: LogModule.PRODUCTS,
    description: 'Created a new product',
    entityType: 'Product',
  })
  async createProduct(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Body() dto: ProductDto,
  ) {
    return this.productService.createProduct(organizationId, dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProducts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @UploadedFile() file: any,
  ) {
    return this.productService.uploadProductsFromExcel(organizationId, file);
  }

  @Get()
  async getAllProducts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.productService.getAllProducts(organizationId);
  }

  @Get('export/excel')
  async exportProductsToExcel(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Res() res: Response,
  ) {
    const buffer =
      await this.productService.exportProductsToExcel(organizationId);

    const filename = `products-${organizationId}-${new Date().toISOString().split('T')[0]}.xlsx`;

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Get('search/barcode')
  async searchProductByBarcode(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Query('barcode') barcode: string,
  ) {
    return this.productService.findProductByBarcode(organizationId, barcode);
  }

  @Get('analytics/value')
  async getProductsValue(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.productService.getProductsValue(organizationId);
  }

  @Get('analytics/value-by-category')
  async getProductsValueByCategory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.productService.getProductsValueByCategory(organizationId);
  }

  @Get('analytics/low-stock')
  async getLowStockProducts(
    @Param('organizationId', ParseIntPipe) organizationId: number,
  ) {
    return this.productService.getLowStockProducts(organizationId);
  }

  @Get(':id')
  async getProductById(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productService.getProductById(organizationId, id);
  }

  @Put(':id')
  @LogActivity({
    action: LogAction.UPDATE,
    module: LogModule.PRODUCTS,
    description: 'Updated product details',
    entityType: 'Product',
  })
  async updateProduct(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProductDto,
  ) {
    return this.productService.updateProduct(organizationId, id, dto);
  }

  @Patch(':id/quantity')
  async updateProductQuantity(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body('quantity') quantity: number,
  ) {
    return this.productService.updateProductQuantityAdded(
      organizationId,
      id,
      quantity,
    );
  }

  @Get(':id/units')
  async getProductUnits(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) productId: number,
    @Query('status') status?: 'IN_STOCK' | 'RESERVED' | 'SOLD',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.productService.getProductUnits(organizationId, productId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      startDate,
      endDate,
      search,
    });
  }

  @Get(':id/units/:unitId/history')
  async getUnitHistory(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) productId: number,
    @Param('unitId', ParseIntPipe) unitId: number,
  ) {
    return this.productService.getUnitHistory(
      organizationId,
      productId,
      unitId,
    );
  }

  @Post(':id/units/bulk')
  async createProductUnits(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) productId: number,
    @Body()
    body: {
      identifiers: string[];
      metadata?: Record<string, any>;
    },
  ) {
    if (!Array.isArray(body.identifiers) || body.identifiers.length === 0) {
      throw new BadRequestException('identifiers array is required');
    }

    return this.productService.bulkCreateProductUnits(
      organizationId,
      productId,
      body.identifiers,
      body.metadata,
    );
  }

  @Post(':id/assets')
  async createProductAsset(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) productId: number,
    @GetUser() user: any,
    @Body()
    body: {
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
    },
  ) {
    return this.productService.createProductAsset(organizationId, productId, {
      ...body,
      uploadedBy: user?.id,
    });
  }

  @Post(':id/assets/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, ProductController.ensureUploadDir());
        },
        filename: (_req, file, cb) => {
          const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${suffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadProductAsset(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) productId: number,
    @GetUser() user: any,
    @UploadedFile() file: any,
    @Body('assetType')
    assetType?:
      | 'IMAGE'
      | 'DOCUMENT'
      | 'LOGBOOK'
      | 'INSURANCE'
      | 'WARRANTY'
      | 'OTHER',
    @Body('productUnitId') productUnitId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const fileUrl = `/uploads/product-assets/${file.filename}`;

    return this.productService.createProductAsset(organizationId, productId, {
      fileUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      assetType,
      productUnitId: productUnitId ? +productUnitId : undefined,
      uploadedBy: user?.id,
    });
  }

  @Delete(':id')
  @LogActivity({
    action: LogAction.DELETE,
    module: LogModule.PRODUCTS,
    description: 'Deleted a product',
    entityType: 'Product',
  })
  async deleteProduct(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productService.deleteProduct(organizationId, id);
  }
}
