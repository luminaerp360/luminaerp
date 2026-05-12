import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakeCreditSalesPayentsComponent } from './make-credit-sales-payents.component';

describe('MakeCreditSalesPayentsComponent', () => {
  let component: MakeCreditSalesPayentsComponent;
  let fixture: ComponentFixture<MakeCreditSalesPayentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MakeCreditSalesPayentsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MakeCreditSalesPayentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
