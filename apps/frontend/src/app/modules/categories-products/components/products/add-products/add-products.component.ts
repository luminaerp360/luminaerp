import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CategoryService } from '../../../../../shared/Services/category.service';
import { ProductService } from '../../../../../shared/Services/product.service';
import { Category } from '../../../../../shared/interfaces/categories';
import { ModalComponent } from '../../../../../shared/Data/components/modal/modal.component';
import { Product } from '../../../../../shared/interfaces/products';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-add-products',
  templateUrl: './add-products.component.html',
  styleUrls: ['./add-products.component.scss'],
})
export class AddProductsComponent extends ModalComponent {
  productForm: FormGroup;
  categories: Category[] = [];
  @Input() modalId: string = '';
  @Input() isModalVisible: boolean = false;
  @Output() toggleModal = new EventEmitter<void>();
  isUpdateMode: boolean = false;
  product: Product | null = null;
  useCustomCategory: boolean = false;
  isSubmitting: boolean = false;
  trackingModes = ['NONE', 'SERIAL', 'IMEI', 'REGISTRATION'];
  assetTypeOptions = [
    'IMAGE',
    'DOCUMENT',
    'LOGBOOK',
    'INSURANCE',
    'WARRANTY',
    'OTHER',
  ];
  unitIdentifiersText = '';
  selectedAssetTypes: string[] = [];
  assetFiles: File[] = [];

  // New modern features
  productStatuses = ['DRAFT', 'ACTIVE'];
  availableTags: string[] = [
    'Bestseller',
    'New',
    'Featured',
    'On Sale',
    'Trending',
  ];
  selectedTags: string[] = [];
  weightUnits = ['kg', 'g', 'lb', 'oz'];
  dimensionUnits = ['cm', 'inch', 'm'];

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private productService: ProductService,
  ) {
    super();
    this.product = this.dialogRemoteControl.payload;
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      productIdNumber: [''],
      reorderLevel: [null],
      price: [null, Validators.required],
      buyingPrice: [null],
      wholesalePrice: [null], // Optional wholesale price
      countable: [true],
      isService: [false],
      quantity: [''],
      categoryId: [''],
      categoryName: [''],
      description: [''],
      picture: [''],
      // Commission fields
      isCommissionable: [true],
      defaultCommissionType: ['PERCENTAGE'],
      defaultCommissionValue: [0, [Validators.min(0)]],
      // New modern fields
      status: ['ACTIVE'],
      sku: [''],
      tags: [[]],
      weight: [null],
      weightUnit: ['kg'],
      dimensions: this.fb.group({
        length: [null],
        width: [null],
        height: [null],
        unit: ['cm'],
      }),
      hasVariants: [false],
      isTaxable: [true],
      taxInclusive: [true], // Default to true (inclusive by default)
      taxRateId: [null], // FK to TaxRate table
      minOrderQuantity: [null],
      maxOrderQuantity: [null],
      trackingMode: ['NONE'],
      batchTracking: [false],
      requiresUniqueIdentifiers: [false],
      requiredAssetTypes: [[]],
    });

    // Set up category validators based on mode
    this.updateCategoryValidators();

    // Set up quantity validator based on service type
    this.updateQuantityValidator();

    if (this.product) {
      this.productForm.patchValue(this.product);
      this.selectedAssetTypes = this.product.requiredAssetTypes || [];
      this.isUpdateMode = true;
    }
  }

  ngOnInit() {
    this.fetchCategories();

    // Listen for changes to isService to update quantity validator
    this.productForm.get('isService')?.valueChanges.subscribe(() => {
      this.updateQuantityValidator();
    });

    this.productForm.get('trackingMode')?.valueChanges.subscribe(() => {
      this.updateQuantityValidator();
    });

    // Set selected tags from product if in update mode
    if (this.product && this.product.tags) {
      this.selectedTags = Array.isArray(this.product.tags)
        ? this.product.tags
        : [];
    }

    // Handle tax logic automatically
    this.setupTaxLogic();
  }

  /**
   * Setup automatic tax logic based on requirements:
   * 1. If taxable AND taxInclusive = true → Default to "inclusive"
   * 2. If NOT taxable → Set to "exempt"
   * 3. If taxable AND taxInclusive = false → Set to "exclusive" (add tax)
   */
  setupTaxLogic() {
    // Listen for isTaxable changes
    this.productForm.get('isTaxable')?.valueChanges.subscribe((isTaxable) => {
      if (!isTaxable) {
        // Not taxable = exempt
        this.productForm.patchValue({
          taxInclusive: false,
        }, { emitEvent: false });
      } else {
        // Taxable = default to inclusive
        this.productForm.patchValue({
          taxInclusive: true,
        }, { emitEvent: false });
      }
    });
  }

  /**
   * Get computed tax type for display
   */
  getComputedTaxType(): 'exempt' | 'inclusive' | 'exclusive' {
    const isTaxable = this.productForm.get('isTaxable')?.value;
    const taxInclusive = this.productForm.get('taxInclusive')?.value;

    if (!isTaxable) {
      return 'exempt';
    }

    return taxInclusive ? 'inclusive' : 'exclusive';
  }

  toggleTag(tag: string): void {
    const index = this.selectedTags.indexOf(tag);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.productForm.patchValue({ tags: this.selectedTags });
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags.includes(tag);
  }

  fetchCategories() {
    this.categoryService
      .getAllCategories()
      .subscribe((categories: Category[]) => {
        this.categories = categories;
      });
  }

  toggleCategoryInput() {
    this.useCustomCategory = !this.useCustomCategory;
    this.updateCategoryValidators();
  }

  updateCategoryValidators() {
    const categoryIdControl = this.productForm.get('categoryId');
    const categoryNameControl = this.productForm.get('categoryName');

    if (this.useCustomCategory) {
      categoryNameControl?.setValidators([Validators.required]);
      categoryIdControl?.clearValidators();
    } else {
      categoryIdControl?.setValidators([Validators.required]);
      categoryNameControl?.clearValidators();
    }

    categoryIdControl?.updateValueAndValidity();
    categoryNameControl?.updateValueAndValidity();
  }

  updateQuantityValidator() {
    const quantityControl = this.productForm.get('quantity');
    const reorderLevelControl = this.productForm.get('reorderLevel');
    const isService = this.productForm.get('isService')?.value;
    const isTracked = this.productForm.get('trackingMode')?.value !== 'NONE';

    if (isService || isTracked) {
      quantityControl?.clearValidators();
      reorderLevelControl?.clearValidators();
    } else {
      quantityControl?.setValidators([Validators.required]);
      reorderLevelControl?.setValidators([Validators.required]);
    }

    quantityControl?.updateValueAndValidity();
    reorderLevelControl?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.productForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const productData = this.prepareFormData();

      this.productService.addProduct(productData).subscribe({
        next: async (response: any) => {
          try {
            await this.persistTrackedData(response?.id);
            console.log('Product added successfully:', response);
            this.productForm.reset();
            this.isSubmitting = false;
            this.close();
          } catch (error) {
            console.error('Error creating units/assets:', error);
            this.isSubmitting = false;
          }
        },
        error: (error: any) => {
          console.error('Error adding product:', error);
          this.isSubmitting = false;
        },
      });
    }
  }

  updateProduct() {
    if (this.productForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const productData = this.prepareFormData();

      this.productService
        .updateProduct(this.product!.id, productData)
        .subscribe({
          next: async (response: any) => {
            try {
              await this.persistTrackedData(this.product!.id);
              console.log('Product updated successfully:', response);
              this.productForm.reset();
              this.isSubmitting = false;
              this.close();
            } catch (error) {
              console.error('Error updating units/assets:', error);
              this.isSubmitting = false;
            }
          },
          error: (error: any) => {
            console.error('Error updating product:', error);
            this.isSubmitting = false;
          },
        });
    }
  }

  prepareFormData() {
    const formValue = this.productForm.value;

    // Create a new object to hold the prepared data
    const productData: any = {
      name: formValue.name,
      productIdNumber: formValue.productIdNumber,
      reorderLevel: formValue.reorderLevel,
      price: formValue.price,
      buyingPrice: formValue.buyingPrice,
      quantity: formValue.trackingMode === 'NONE' ? formValue.quantity : 0,
      countable: formValue.countable,
      isService: formValue.isService,
      description: formValue.description,
      // Commission fields
      isCommissionable: formValue.isCommissionable,
      defaultCommissionType: formValue.defaultCommissionType,
      defaultCommissionValue: formValue.defaultCommissionValue,
      // Modern fields
      status: formValue.status,
      sku: formValue.sku,
      tags: this.selectedTags,
      weight: formValue.weight,
      weightUnit: formValue.weightUnit,
      dimensions: formValue.dimensions,
      hasVariants: formValue.hasVariants,
      isTaxable: formValue.isTaxable,
      taxInclusive: formValue.taxInclusive,
      taxRateId: formValue.taxRateId, // Add tax rate ID
      minOrderQuantity: formValue.minOrderQuantity,
      maxOrderQuantity: formValue.maxOrderQuantity,
      trackingMode: formValue.trackingMode,
      batchTracking: formValue.batchTracking,
      requiresUniqueIdentifiers:
        formValue.trackingMode !== 'NONE' ||
        formValue.requiresUniqueIdentifiers,
      requiredAssetTypes: this.selectedAssetTypes,
    };

    // Add wholesale price if provided
    if (formValue.wholesalePrice) {
      productData.wholesalePrice = formValue.wholesalePrice;
    }

    // Handle the category based on mode
    if (this.useCustomCategory) {
      productData.categoryName = formValue.categoryName;
    } else {
      productData.categoryId = parseInt(formValue.categoryId, 10);
      // Find and include the category name from the selected category
      const selectedCategory = this.categories.find(
        (cat) => cat.id === productData.categoryId,
      );
      if (selectedCategory) {
        productData.categoryName = selectedCategory.name;
      }
    }

    return productData;
  }

  submit() {
    if (this.isUpdateMode) {
      this.updateProduct();
    } else {
      this.onSubmit();
    }
  }

  toggleAssetType(type: string): void {
    const index = this.selectedAssetTypes.indexOf(type);
    if (index > -1) {
      this.selectedAssetTypes.splice(index, 1);
    } else {
      this.selectedAssetTypes.push(type);
    }
    this.productForm.patchValue({
      requiredAssetTypes: this.selectedAssetTypes,
    });
  }

  isAssetTypeSelected(type: string): boolean {
    return this.selectedAssetTypes.includes(type);
  }

  onAssetFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files ? Array.from(target.files) : [];
    this.assetFiles = files;
  }

  isTrackedProduct(): boolean {
    return this.productForm.get('trackingMode')?.value !== 'NONE';
  }

  private parseIdentifiers(): string[] {
    return this.unitIdentifiersText
      .split(/\r?\n|,|;/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private async persistTrackedData(productId?: number): Promise<void> {
    if (!productId) return;

    if (this.isTrackedProduct()) {
      const identifiers = this.parseIdentifiers();
      if (identifiers.length > 0) {
        await firstValueFrom(
          this.productService.bulkCreateProductUnits(productId, identifiers),
        );
      }
    }

    if (this.assetFiles.length > 0) {
      const assetType = this.selectedAssetTypes[0] as
        | 'IMAGE'
        | 'DOCUMENT'
        | 'LOGBOOK'
        | 'INSURANCE'
        | 'WARRANTY'
        | 'OTHER'
        | undefined;

      for (const file of this.assetFiles) {
        await firstValueFrom(
          this.productService.uploadProductAsset(productId, file, assetType),
        );
      }
    }
  }
}
