import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashSalesComponent } from './cash-sales.component';

describe('CashSalesComponent', () => {
  let component: CashSalesComponent;
  let fixture: ComponentFixture<CashSalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CashSalesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CashSalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
