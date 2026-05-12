import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerFullCreditStatementComponent } from './customer-full-credit-statement.component';

describe('CustomerFullCreditStatementComponent', () => {
  let component: CustomerFullCreditStatementComponent;
  let fixture: ComponentFixture<CustomerFullCreditStatementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CustomerFullCreditStatementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CustomerFullCreditStatementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
