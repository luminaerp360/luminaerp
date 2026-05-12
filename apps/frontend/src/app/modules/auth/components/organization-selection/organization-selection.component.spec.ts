import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationSelectionComponent } from './organization-selection.component';

describe('OrganizationSelectionComponent', () => {
  let component: OrganizationSelectionComponent;
  let fixture: ComponentFixture<OrganizationSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrganizationSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OrganizationSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
