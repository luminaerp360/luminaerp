import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintTestComponent } from './print-test.component';

describe('PrintTestComponent', () => {
  let component: PrintTestComponent;
  let fixture: ComponentFixture<PrintTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrintTestComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PrintTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
