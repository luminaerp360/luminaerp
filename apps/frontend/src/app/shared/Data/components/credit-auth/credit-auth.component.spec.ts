import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditAuthComponent } from './credit-auth.component';

describe('CreditAuthComponent', () => {
  let component: CreditAuthComponent;
  let fixture: ComponentFixture<CreditAuthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CreditAuthComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreditAuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
