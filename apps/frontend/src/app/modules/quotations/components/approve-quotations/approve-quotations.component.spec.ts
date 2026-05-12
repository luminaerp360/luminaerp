import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApproveQuotationsComponent } from './approve-quotations.component';

describe('ApproveQuotationsComponent', () => {
  let component: ApproveQuotationsComponent;
  let fixture: ComponentFixture<ApproveQuotationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApproveQuotationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApproveQuotationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
