import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomersDebtComponent } from './customers-debt.component';

describe('CustomersDebtComponent', () => {
  let component: CustomersDebtComponent;
  let fixture: ComponentFixture<CustomersDebtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CustomersDebtComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CustomersDebtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
