import { describe, expect, it } from 'vitest';
import { createUserSchema, roleEnum } from './user.validation.js';

describe('user role validation', () => {
  it('accepts SUPERUSER when creating or updating users', () => {
    expect(roleEnum.safeParse('SUPERUSER').success).toBe(true);
    expect(
      createUserSchema.safeParse({
        name: 'System Superuser',
        email: 'superuser@moa.gov.et',
        password: 'SecurePassword123!',
        role: 'SUPERUSER',
      }).success,
    ).toBe(true);
  });
});
