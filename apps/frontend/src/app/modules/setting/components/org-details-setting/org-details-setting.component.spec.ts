import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrgDetailsSettingComponent } from './org-details-setting.component';

describe('OrgDetailsSettingComponent', () => {
  let component: OrgDetailsSettingComponent;
  let fixture: ComponentFixture<OrgDetailsSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrgDetailsSettingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OrgDetailsSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
