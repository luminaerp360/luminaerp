import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLpoComponent } from './add-lpo.component';

describe('AddLpoComponent', () => {
  let component: AddLpoComponent;
  let fixture: ComponentFixture<AddLpoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddLpoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddLpoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
