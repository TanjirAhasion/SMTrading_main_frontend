import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseList } from './purchase-list';

describe('PurchaseList', () => {
  let component: PurchaseList;
  let fixture: ComponentFixture<PurchaseList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseList],
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
