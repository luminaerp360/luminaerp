import { TestBed } from '@angular/core/testing';

import { CreditPaymentsService } from './credit-payments.service';

describe('CreditPaymentsService', () => {
  let service: CreditPaymentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreditPaymentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
