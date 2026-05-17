import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashAccount } from './cash-account';

describe('CashAccount', () => {
  let component: CashAccount;
  let fixture: ComponentFixture<CashAccount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CashAccount],
    }).compileComponents();

    fixture = TestBed.createComponent(CashAccount);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
