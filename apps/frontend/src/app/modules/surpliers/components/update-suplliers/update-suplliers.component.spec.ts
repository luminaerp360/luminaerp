import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateSuplliersComponent } from './update-suplliers.component';

describe('UpdateSuplliersComponent', () => {
  let component: UpdateSuplliersComponent;
  let fixture: ComponentFixture<UpdateSuplliersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateSuplliersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UpdateSuplliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
