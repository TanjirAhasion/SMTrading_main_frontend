import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseCategory } from './expense-category';

describe('ExpenseCategory', () => {
  let component: ExpenseCategory;
  let fixture: ComponentFixture<ExpenseCategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseCategory],
    }).compileComponents();

    fixture = TestBed.createComponent(ExpenseCategory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
