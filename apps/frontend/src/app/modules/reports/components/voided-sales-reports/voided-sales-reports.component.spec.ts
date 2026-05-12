import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoidedSalesReportsComponent } from './voided-sales-reports.component';

describe('VoidedSalesReportsComponent', () => {
  let component: VoidedSalesReportsComponent;
  let fixture: ComponentFixture<VoidedSalesReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VoidedSalesReportsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VoidedSalesReportsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
