import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddQuatationsComponent } from './add-quatations.component';

describe('AddQuatationsComponent', () => {
  let component: AddQuatationsComponent;
  let fixture: ComponentFixture<AddQuatationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddQuatationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddQuatationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
