import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateQuotationsComponent } from './update-quotations.component';

describe('UpdateQuotationsComponent', () => {
  let component: UpdateQuotationsComponent;
  let fixture: ComponentFixture<UpdateQuotationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateQuotationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateQuotationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
