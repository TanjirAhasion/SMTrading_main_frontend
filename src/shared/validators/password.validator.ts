import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom Validators
 *
 * Kept here (not inside a component) so they are:
 *  - Reusable across forms
 *  - Unit-testable with zero Angular setup (pure functions)
 */

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';

    if (!value) return null; // Let `required` handle empty case

    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasMinLength = value.length >= 8;

    const valid = hasUppercase && hasLowercase && hasDigit && hasMinLength;

    return valid
      ? null
      : {
          passwordStrength: {
            hasUppercase,
            hasLowercase,
            hasDigit,
            hasMinLength,
          },
        };
  };
}