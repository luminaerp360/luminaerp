import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowSuplliersComponent } from './show-suplliers.component';

describe('ShowSuplliersComponent', () => {
  let component: ShowSuplliersComponent;
  let fixture: ComponentFixture<ShowSuplliersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShowSuplliersComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ShowSuplliersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
