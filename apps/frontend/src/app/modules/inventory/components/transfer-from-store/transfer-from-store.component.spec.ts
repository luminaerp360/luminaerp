import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransferFromStoreComponent } from './transfer-from-store.component';

describe('TransferFromStoreComponent', () => {
  let component: TransferFromStoreComponent;
  let fixture: ComponentFixture<TransferFromStoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TransferFromStoreComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TransferFromStoreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
