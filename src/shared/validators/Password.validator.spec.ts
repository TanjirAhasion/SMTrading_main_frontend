import { FormControl } from '@angular/forms';
import { passwordStrengthValidator } from './password.validator';

/**
 * Validator unit tests — pure function, no Angular TestBed needed.
 * This is the ideal unit test: fast, simple, zero setup.
 */
describe('passwordStrengthValidator', () => {
  const validator = passwordStrengthValidator();

  const control = (value: string) => new FormControl(value);

  it('should return null for a strong password', () => {
    expect(validator(control('Password1'))).toBeNull();
  });

//   it('should fail if shorter than 8 characters', () => {
//     const errors = validator(control('Pw1'));
//     expect(errors?.['passwordStrength'].hasMinLength).toBeFalse();
//   });

//   it('should fail if no uppercase letter', () => {
//     const errors = validator(control('password1'));
//     expect(errors?.['passwordStrength'].hasUppercase).toBeFalse();
//   });

//   it('should fail if no digit', () => {
//     const errors = validator(control('Password'));
//     expect(errors?.['passwordStrength'].hasDigit).toBeFalse();
//   });

  it('should return null for empty value (defer to required validator)', () => {
    expect(validator(control(''))).toBeNull();
  });
});