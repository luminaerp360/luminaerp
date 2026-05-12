import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MakeCreditSalesComponent } from './make-credit-sales.component';

describe('MakeCreditSalesComponent', () => {
  let component: MakeCreditSalesComponent;
  let fixture: ComponentFixture<MakeCreditSalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MakeCreditSalesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MakeCreditSalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
