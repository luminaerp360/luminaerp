import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuotationService } from '../../../../shared/Services/quotation.service';
import { Quotation } from '../../../../shared/interfaces/quotation.interface';
import { HotToastClose, HotToastService } from '@ngneat/hot-toast';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { Customer } from '../../../../shared/interfaces/customer.interface';
import { Product } from '../../../../shared/interfaces/products';

@Component({
  selector: 'app-update-quotations',
  templateUrl: './update-quotations.component.html',
  styleUrls: ['./update-quotations.component.scss'],
})
export class UpdateQuotationsComponent implements OnInit {
  updateForm: FormGroup;
  quotationId: number = 0;
  products: Product[] = [];
  customers: Customer[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private quotationService: QuotationService,
    private toast: HotToastService,
    private productService: ProductService,
    private customersService: CustomerService,
  ) {
    this.updateForm = this.fb.group({
      customerId: ['', Validators.required],
      items: this.fb.array([]),
      totalAmount: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.quotationId = +this.route.snapshot.paramMap.get('id')!;
    this.loadQuotation();
    this.loadProducts();
    this.getAllCustomers();
  }

  loadQuotation() {
    this.quotationService.getQuotationbyId(this.quotationId).subscribe(
      (quotation: Quotation) => {
        // Parse items if they come as a string
        const items =
          typeof quotation.items === 'string'
            ? JSON.parse(quotation.items)
            : quotation.items;

        this.updateForm.patchValue({
          customerId: quotation.customerId || quotation.supplierId,
          totalAmount: quotation.totalAmount,
        });
        items.forEach((item: any) => this.addItem(item));
      },
      (error) => console.error('Error loading quotation:', error),
    );
  }

  get itemsFormArray() {
    return this.updateForm.get('items') as FormArray;
  }

  loadProducts() {
    this.productService.getAllProducts().subscribe(
      (products) => (this.products = products),
      (error) => console.error('Error loading products:', error),
    );
  }

  getProductNameById(id: number): string {
    const product = this.products.find((p) => p.id === id);
    if (product) {
      return product.name;
    } else {
      return 'Loading...';
    }
  }
  getAllCustomers(): void {
    this.customersService.getAllCustomers().subscribe((customers) => {
      this.customers = customers;
    });
  }
  getCustomerNameById(id: number): string {
    const customer = this.customers.find((p) => p.id === id);
    if (customer) {
      return customer.fullName;
    } else {
      return 'Loading...';
    }
  }

  addItem(item: any = null) {
    this.itemsFormArray.push(
      this.fb.group({
        productId: [item ? item.productId : '', Validators.required],
        quantity: [
          item ? item.quantity : 1,
          [Validators.required, Validators.min(1)],
        ],
      }),
    );
  }

  removeItem(index: number) {
    this.itemsFormArray.removeAt(index);
  }

  onSubmit() {
    if (this.updateForm.valid) {
      const updatedQuotation = this.updateForm.value;
      updatedQuotation.items = JSON.stringify(updatedQuotation.items);

      this.quotationService
        .updateQuotation(this.quotationId, updatedQuotation)
        .subscribe(
          () => {
            this.toast.success('Quotation updated successfully');
            this.router.navigate(['/quotations']);
          },
          (error) => this.toast.error('Error updating quotation'),
        );
    }
  }
}
