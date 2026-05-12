import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginComponent } from './components/login/login.component';
import { OrganizationSelectionComponent } from './components/organization-selection/organization-selection.component';
import { RegisterComponent } from './components/register/register.component';
import { VerifyEmailComponent } from './components/verify-email/verify-email.component';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from '../../app-routing.module';
import { UserListComponent } from './components/user-list/user-list.component';
import { LoginModalComponent } from './components/login-modal/login-modal.component';

@NgModule({
  declarations: [
    LoginComponent,
    OrganizationSelectionComponent,
    RegisterComponent,
    VerifyEmailComponent,
    UserListComponent,
    LoginModalComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    AppRoutingModule,
  ],
})
export class AuthModule {}
