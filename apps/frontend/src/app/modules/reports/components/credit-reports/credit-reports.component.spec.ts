import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditReportsComponent } from './credit-reports.component';

describe('CreditReportsComponent', () => {
  let component: CreditReportsComponent;
  let fixture: ComponentFixture<CreditReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreditReportsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreditReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
