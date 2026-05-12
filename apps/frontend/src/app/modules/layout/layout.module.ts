import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthLayoutComponent } from './components/auth-layout/auth-layout.component';
import { AppModule } from '../../app.module';
import { BackButtonComponent } from '../../shared/Data/components/back-button/back-button.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  declarations: [],
  imports: [CommonModule, BackButtonComponent, SharedModule],
})
export class LayoutModule {}
