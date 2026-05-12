import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockTransComponent } from './stock-trans.component';

describe('StockTransComponent', () => {
  let component: StockTransComponent;
  let fixture: ComponentFixture<StockTransComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StockTransComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StockTransComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
