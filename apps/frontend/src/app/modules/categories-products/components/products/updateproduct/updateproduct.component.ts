import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { CategoryService } from '../../../../../shared/Services/category.service';
import { ProductService } from '../../../../../shared/Services/product.service';
import { Category } from '../../../../../shared/interfaces/categories';
import { Product } from '../../../../../shared/interfaces/products';

@Component({
  selector: 'app-updateproduct',
  templateUrl: './updateproduct.component.html',
  styleUrl: './updateproduct.component.scss',
})
export class UpdateproductComponent implements OnChanges {
  productForm: FormGroup;
  categories: Category[] = [];
  selectedProduct: Product | null = null;
  @Input() modalId: string = '';
  @Input() productIdToEdit: number | null = null;
  @Input() isModalVisible: boolean = false;
  @Output() toggleModal = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService,
    private productService: ProductService
  ) {
    this.productForm = this.fb.group({
      name: ['', Validators.required],
      price: ['', Validators.required],
      quantity: ['', Validators.required],
      categoryId: ['', Validators.required],
      description: [''],
      picture: [''],
    });
  }

  ngOnInit() {
    this.fetchCategories();
  }
  ngOnChanges(changes: SimpleChanges) {
    if (changes['productIdToEdit'] && !changes['productIdToEdit'].firstChange) {
      this.getProductToEdit();
    }
  }

  fetchCategories() {
    this.categoryService
      .getAllCategories()
      .subscribe((categories: Category[]) => {
        this.categories = categories;
      });
  }

  getProductToEdit() {
    this.productService
      .getProductbyId(this.productIdToEdit!)
      .subscribe((product: Product) => {
        this.selectedProduct = product;
        this.productForm.patchValue({
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          categoryId: product.categoryId,
          description: product.description,
          picture: product.picture,
        });
      });
  }

  onSubmit() {
    if (this.productForm.valid) {
      const productData = this.productForm.value;
      this.productService
        .updateProduct(this.productIdToEdit!, productData)
        .subscribe(
          (response: any) => {
            console.log('Product added successfully:', response);
            // Reset the form if needed
            this.productForm.reset();
          },
          (error: any) => {
            console.error('Error adding product:', error);
            // Handle error
          }
        );
    }
  }

  closeModal() {
    this.toggleModal.emit();
  }
}
