import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoceList } from './invoce-list';

describe('InvoceList', () => {
  let component: InvoceList;
  let fixture: ComponentFixture<InvoceList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoceList],
    }).compileComponents();

    fixture = TestBed.createComponent(InvoceList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
