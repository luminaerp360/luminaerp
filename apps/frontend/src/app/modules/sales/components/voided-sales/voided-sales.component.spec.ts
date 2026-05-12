import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoidedSalesComponent } from './voided-sales.component';

describe('VoidedSalesComponent', () => {
  let component: VoidedSalesComponent;
  let fixture: ComponentFixture<VoidedSalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VoidedSalesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VoidedSalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
