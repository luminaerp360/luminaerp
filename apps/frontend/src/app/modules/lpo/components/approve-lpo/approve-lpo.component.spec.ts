import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApproveLpoComponent } from './approve-lpo.component';

describe('ApproveLpoComponent', () => {
  let component: ApproveLpoComponent;
  let fixture: ComponentFixture<ApproveLpoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApproveLpoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApproveLpoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
