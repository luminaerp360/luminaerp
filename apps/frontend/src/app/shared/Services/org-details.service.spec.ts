import { TestBed } from '@angular/core/testing';

import { OrgDetailsService } from './org-details.service';

describe('OrgDetailsService', () => {
  let service: OrgDetailsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrgDetailsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
