import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowQuotationsComponent } from './show-quotations.component';

describe('ShowQuotationsComponent', () => {
  let component: ShowQuotationsComponent;
  let fixture: ComponentFixture<ShowQuotationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShowQuotationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ShowQuotationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
