import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LpoListComponent } from './lpo-list.component';

describe('LpoListComponent', () => {
  let component: LpoListComponent;
  let fixture: ComponentFixture<LpoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LpoListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LpoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
