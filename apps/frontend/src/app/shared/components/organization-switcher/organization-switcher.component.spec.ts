import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrganizationSwitcherComponent } from './organization-switcher.component';

describe('OrganizationSwitcherComponent', () => {
  let component: OrganizationSwitcherComponent;
  let fixture: ComponentFixture<OrganizationSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OrganizationSwitcherComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(OrganizationSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
