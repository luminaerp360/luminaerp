import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateStockTransferComponent } from './create-stock-transfer.component';

describe('CreateStockTransferComponent', () => {
  let component: CreateStockTransferComponent;
  let fixture: ComponentFixture<CreateStockTransferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreateStockTransferComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateStockTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
