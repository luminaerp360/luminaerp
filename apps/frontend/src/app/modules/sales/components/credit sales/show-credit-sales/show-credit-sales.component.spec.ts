import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowCreditSalesComponent } from './show-credit-sales.component';

describe('ShowCreditSalesComponent', () => {
  let component: ShowCreditSalesComponent;
  let fixture: ComponentFixture<ShowCreditSalesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShowCreditSalesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ShowCreditSalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
