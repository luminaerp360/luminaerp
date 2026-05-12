import { Component, EventEmitter, Output } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent extends ModalComponent {
  @Output() closeModal = new EventEmitter<void>();
  password: string = '';
  posting: boolean = false;
  showPassword: boolean = false;
  isDarkMode: boolean = true;

  constructor() {
    super();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  onSubmit(): void {
    if (!this.password) {
      this.toast.error('Please enter a password');
      return;
    }

    this.posting = true;
    const data = {
      email: localStorage.getItem('userEmail'),
      password: this.password,
    };

    this.authService.signIn(data).subscribe({
      next: (res) => {
        this.salesService.isAuthenticated.next(true);
        const authenticated = this.salesService.isAuthenticated.value;
        if (authenticated) {
          this.submitSales();
        }
      },
      error: (err) => {
        this.posting = false;
        this.toast.error('Invalid password try again!');
        this.password = '';
      },
    });
  }

  submitSales(): void {
    if (
      this.dialogRemoteControl.payload.amountPaid <
      this.dialogRemoteControl.payload.Total
    ) {
      this.toast.error('Insufficient amount paid');
      this.close();
      return;
    }

    this.salesService.addSales(this.dialogRemoteControl.payload).subscribe({
      next: (response) => {
        this.toast.success('Sales added successfully');
        this.posting = false;
        this.close();
        this.router.routeReuseStrategy.shouldReuseRoute = () => false;
        this.router.onSameUrlNavigation = 'reload';
        this.router.navigate(['/sales']);
      },
    });
  }
}
