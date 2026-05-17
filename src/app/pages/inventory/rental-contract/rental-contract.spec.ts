import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RentalContract } from './rental-contract';

describe('RentalContract', () => {
  let component: RentalContract;
  let fixture: ComponentFixture<RentalContract>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RentalContract],
    }).compileComponents();

    fixture = TestBed.createComponent(RentalContract);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
