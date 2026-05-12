import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewTranferDetailsComponent } from './view-tranfer-details.component';

describe('ViewTranferDetailsComponent', () => {
  let component: ViewTranferDetailsComponent;
  let fixture: ComponentFixture<ViewTranferDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ViewTranferDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewTranferDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
