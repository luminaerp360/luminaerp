import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QuotationService } from '../../../../shared/Services/quotation.service';
import { SalesService } from '../../../../shared/Services/sales.service';
import { Quotation } from '../../../../shared/interfaces/quotation.interface';
import { HotToastService } from '@ngneat/hot-toast';
import { ProductService } from '../../../../shared/Services/product.service';
import { Product } from '../../../../shared/interfaces/products';
import { CustomerService } from '../../../../shared/Services/customer.service';
import { Customer } from '../../../../shared/interfaces/customer.interface';

@Component({
  selector: 'app-approve-quotations',
  templateUrl: './approve-quotations.component.html',
  styleUrls: ['./approve-quotations.component.scss'],
})
export class ApproveQuotationsComponent implements OnInit {
  quotation: Quotation | null = null;
  approvalForm: FormGroup;
  quotationId: number = 0;
  products: Product[] = [];
  customers: Customer[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private quotationService: QuotationService,
    private toast: HotToastService,
    private salesService: SalesService,
    private productService: ProductService,
    private customersService: CustomerService,
  ) {
    this.approvalForm = this.fb.group({
      cashPaid: [0, [Validators.required, Validators.min(0)]],
      mpesaPaid: [0, [Validators.required, Validators.min(0)]],
      bankPaid: [0, [Validators.required, Validators.min(0)]],
      mpesaTransactionId: [''],
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
      (res: any) => {
        this.quotation = res.data;
        this.quotation!.items = JSON.parse(this.quotation!.items as string);
        console.log('Items', this.quotation!.items);
      },
      (error) => console.error('Error loading quotation:', error),
    );
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

  onSubmit() {
    if (this.approvalForm.valid) {
      const formValues = this.approvalForm.value;
      const totalAmountPaid =
        formValues.cashPaid + formValues.mpesaPaid + formValues.bankPaid;

      if (totalAmountPaid !== this.quotation!.totalAmount) {
        alert('Total amount paid must equal the quotation total amount');
        return;
      }

      const saleData = {
        items: this.quotation!.items,
        total: this.quotation!.totalAmount,
        customerId: this.quotation!.customerId,
        cashPaid: formValues.cashPaid,
        mpesaPaid: formValues.mpesaPaid,
        bankPaid: formValues.bankPaid,
        totalAmountPaid: totalAmountPaid,
        taxAmount: totalAmountPaid * 0.16,
        printerIp: '192.168.1.2',
        isVoided: false,
        voidedBy: 1,
        discountAmount: 0,
        mpesaTransactionId: formValues.mpesaTransactionId || undefined,
      };

      this.salesService.addSales(saleData).subscribe(
        (response) => {
          this.toast.success('Sale created Successfully');
          this.updateQuotationStatus();
        },
        (error) => this.toast.error('Error creating sale'),
      );
    }
  }

  updateQuotationStatus() {
    this.quotationService.approveQuotation(this.quotationId).subscribe(
      () => {
        console.log('Quotation approved');
        this.router.navigate(['/cash-sales']);
      },
      (error) => console.error('Error approving quotation:', error),
    );
  }
}
