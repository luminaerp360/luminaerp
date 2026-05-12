import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuppliersPaymentsComponent } from './suppliers-payments.component';

describe('SuppliersPaymentsComponent', () => {
  let component: SuppliersPaymentsComponent;
  let fixture: ComponentFixture<SuppliersPaymentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SuppliersPaymentsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SuppliersPaymentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
