import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BtnLOderComponent } from './btn-loder.component';

describe('BtnLOderComponent', () => {
  let component: BtnLOderComponent;
  let fixture: ComponentFixture<BtnLOderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BtnLOderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BtnLOderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
