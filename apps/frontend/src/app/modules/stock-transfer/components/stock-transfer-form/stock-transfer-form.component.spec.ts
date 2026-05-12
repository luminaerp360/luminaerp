import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockTransferFormComponent } from './stock-transfer-form.component';

describe('StockTransferFormComponent', () => {
  let component: StockTransferFormComponent;
  let fixture: ComponentFixture<StockTransferFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StockTransferFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StockTransferFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
