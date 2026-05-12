import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreProductDto } from './create-store-product.dto';

export class UpdateStoreProductDto extends PartialType(CreateStoreProductDto) {}