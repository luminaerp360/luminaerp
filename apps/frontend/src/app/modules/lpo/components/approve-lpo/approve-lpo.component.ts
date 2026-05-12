import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { LpoService } from '../../../../shared/Services/lpo.service';
import { ProductService } from '../../../../shared/Services/product.service';
import { InventoryService } from '../../../../shared/Services/inventory.service';
import { Product } from '../../../../shared/interfaces/products';
import { LpoInterface } from '../../../../shared/interfaces/lpo.interface';
import { SuppliersService } from '../../../../shared/Services/suppliers.service';
import { Supplier } from '../../../../shared/interfaces/supplier.interface';
import { HotToastService } from '@ngneat/hot-toast';

@Component({
  selector: 'app-approve-lpo',
  templateUrl: './approve-lpo.component.html',
  styleUrls: ['./approve-lpo.component.scss'],
})
export class ApproveLpoComponent implements OnInit {
  lpoForm: FormGroup;
  lpoId: number = 0;
  suppliers: Supplier[] = [];
  products: Product[] = [];

  // Loading states
  isLoadingLpo: boolean = true;
  isLoadingSuppliers: boolean = true;
  isLoadingProducts: boolean = true;
  isSubmitting: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private lpoService: LpoService,
    private productService: ProductService,
    private inventoryService: InventoryService,
    private suppliersService: SuppliersService,
    private toast: HotToastService
  ) {
    this.lpoForm = this.fb.group({
      supplierId: ['', Validators.required],
      items: this.fb.array([]),
      totalAmount: [0, [Validators.required, Validators.min(0)]],
      status: ['pending', Validators.required],
    });
  }

  ngOnInit() {
    this.lpoId = +this.route.snapshot.paramMap.get('id')!;
    this.loadLpo();
    this.loadProducts();
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.isLoadingSuppliers = true;
    this.suppliersService.getAllSupplier().subscribe(
      (suppliers) => {
        this.suppliers = suppliers;
        this.isLoadingSuppliers = false;
      },
      (error) => {
        console.error('Error loading suppliers:', error);
        this.isLoadingSuppliers = false;
        this.toast.error('Failed to load suppliers');
      }
    );
  }

  loadProducts() {
    this.isLoadingProducts = true;
    this.productService.getAllProducts().subscribe(
      (products) => {
        this.products = products;
        this.isLoadingProducts = false;
      },
      (error) => {
        console.error('Error loading products:', error);
        this.isLoadingProducts = false;
        this.toast.error('Failed to load products');
      }
    );
  }

  loadLpo() {
    this.isLoadingLpo = true;
    this.lpoService.getLpoId(this.lpoId).subscribe(
      (lpo) => {
        this.lpoForm.patchValue({
          supplierId: lpo.supplierId,
          totalAmount: lpo.totalAmount,
          status: lpo.status,
        });
        this.setItems(lpo.items);
        this.isLoadingLpo = false;
      },
      (error) => {
        console.error('Error loading LPO:', error);
        this.isLoadingLpo = false;
        this.toast.error('Failed to load LPO');
      }
    );
  }

  getProductNameById(id: number): string {
    const product = this.products.find((p) => p.id === id);
    return product ? product.name : 'Loading...';
  }

  getSupplierNameById(id: number): string {
    const supplier = this.suppliers.find((s) => s.id === id);
    return supplier ? supplier.name : 'Loading...';
  }

  setItems(items: any[]) {
    const itemForms = items.map((item) =>
      this.fb.group({
        productId: [item.productId, Validators.required],
        quantity: [item.quantity, [Validators.required, Validators.min(1)]],
        price: [0, [Validators.required, Validators.min(0)]],
      })
    );
    const itemsFormArray = this.fb.array(itemForms);
    this.lpoForm.setControl('items', itemsFormArray);
  }

  get items() {
    return this.lpoForm.get('items') as FormArray;
  }

  updateTotalAmount() {
    const total = this.items.controls.reduce((sum, item) => {
      return sum + item.get('quantity')!.value * item.get('price')!.value;
    }, 0);
    this.lpoForm.patchValue({ totalAmount: total });
  }

  approveLpo() {
    if (this.lpoForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      const approvedLpo = this.lpoForm.value;

      if (approvedLpo.status === 'approved') {
        this.toast.error('LPO already approved');
        this.isSubmitting = false;
        return;
      }

      approvedLpo.status = 'approved';

      this.lpoService.updateLpo(this.lpoId, approvedLpo).subscribe(
        () => {
          this.addToInventoryAndUpdateProducts(approvedLpo);
        },
        (error) => {
          console.error('Error approving LPO:', error);
          this.toast.error('Failed to approve LPO');
          this.isSubmitting = false;
        }
      );
    }
  }

  getCurrentUser() {
    const user = JSON.parse(localStorage.getItem('user')!);
    return user.username;
  }

  addToInventoryAndUpdateProducts(approvedLpo: any) {
    const items = approvedLpo.items;
    let completedItems = 0;
    const totalItems = items.length;

    items.forEach((item: { productId: any; quantity: any; price: any }) => {
      this.inventoryService
        .addInventory({
          product_id: item.productId.toString(),
          quantity: item.quantity,
          buying_price: item.price,
          added_by: this.getCurrentUser() || 'admin',
          total: item.quantity * item.price,
          deleted: false,
        })
        .subscribe(
          () => {
            this.updateProductQuantity(item, () => {
              completedItems++;
              if (completedItems === totalItems) {
                this.handleSuccessfulApproval();
              }
            });
          },
          (error) => this.handleError(error)
        );
    });
  }

  private updateProductQuantity(item: any, callback: () => void) {
    this.productService.getProductbyId(item.productId).subscribe(
      (product) => {
        const newQuantity = (product.quantity || 0) + item.quantity;
        this.productService
          .updateProductQuantity(item.productId, newQuantity)
          .subscribe(
            () => callback(),
            (error) => this.handleError(error)
          );
      },
      (error) => this.handleError(error)
    );
  }

  private handleSuccessfulApproval() {
    this.isSubmitting = false;
    this.toast.success('LPO approved successfully');
    this.router.navigate(['/lpo']);
  }

  private handleError(error: any) {
    console.error('Error:', error);
    this.toast.error('An error occurred');
    this.isSubmitting = false;
  }
}
