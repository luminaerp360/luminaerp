import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSuplliersComponent } from './add-suplliers.component';

describe('AddSuplliersComponent', () => {
  let component: AddSuplliersComponent;
  let fixture: ComponentFixture<AddSuplliersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddSuplliersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddSuplliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
