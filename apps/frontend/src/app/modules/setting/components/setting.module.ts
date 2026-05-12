import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../../shared/shared.module';
import { UserPermissionSettingComponent } from './user-permision-setting/user-permision-setting.component';
import { OrgDetailsSettingComponent } from './org-details-setting/org-details-setting.component';
import { AppSettingsComponent } from './app-settings/app-settings.component';
import { DocumentTemplatesComponent } from './document-templates/document-templates.component';

@NgModule({
  declarations: [
    UserPermissionSettingComponent,
    OrgDetailsSettingComponent,
    AppSettingsComponent,
    DocumentTemplatesComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forChild([]),
    HttpClientModule,
    SharedModule,
  ],
  exports: [
    UserPermissionSettingComponent,
    OrgDetailsSettingComponent,
    AppSettingsComponent,
    DocumentTemplatesComponent,
  ],
})
export class SettingModule {}
