import { TestBed } from '@angular/core/testing';

import { CreditSaleService } from './credit-sale.service';

describe('CreditSaleService', () => {
  let service: CreditSaleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreditSaleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
