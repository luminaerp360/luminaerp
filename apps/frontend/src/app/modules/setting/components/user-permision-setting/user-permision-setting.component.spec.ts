import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserPermissionSettingComponent } from './user-permision-setting.component';

describe('UserPermissionSettingComponent', () => {
  let component: UserPermissionSettingComponent;
  let fixture: ComponentFixture<UserPermissionSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UserPermissionSettingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserPermissionSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
