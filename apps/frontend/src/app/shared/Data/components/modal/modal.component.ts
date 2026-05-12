import { Component, inject } from '@angular/core';
import { DialogRemoteControl } from '@ng-vibe/dialog';
import { SalesService } from '../../../Services/sales.service';
import { HotToastService } from '@ngneat/hot-toast';
import { AuthService } from '../../../Services/auth.service';
import { Router } from '@angular/router';
import { CreditSaleService } from '../../../Services/credit-sale.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent {
  dialogRemoteControl: DialogRemoteControl = inject(DialogRemoteControl);
  salesService = inject(SalesService);
  creditSalesService = inject(CreditSaleService);
  toast = inject(HotToastService);
  authService = inject(AuthService);
  router = inject(Router);
  constructor() {
    console.log(this.dialogRemoteControl.payload);
  }

  close(payload?: any): void {
    const data = { payload: payload };
    this.dialogRemoteControl.closeDialog(data);
  }
}
