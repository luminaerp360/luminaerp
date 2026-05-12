import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MulticreditSalePaymentsComponent } from './multicredit-sale-payments.component';

describe('MulticreditSalePaymentsComponent', () => {
  let component: MulticreditSalePaymentsComponent;
  let fixture: ComponentFixture<MulticreditSalePaymentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MulticreditSalePaymentsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MulticreditSalePaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
