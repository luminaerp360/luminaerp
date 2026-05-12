import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewCreditSaleDetailsComponent } from './view-credit-sale-details.component';

describe('ViewCreditSaleDetailsComponent', () => {
  let component: ViewCreditSaleDetailsComponent;
  let fixture: ComponentFixture<ViewCreditSaleDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewCreditSaleDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewCreditSaleDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
