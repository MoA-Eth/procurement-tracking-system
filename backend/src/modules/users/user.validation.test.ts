import { describe, expect, it } from 'vitest';
import {
  createUserSchema,
  roleEnum,
  updateUserSchema,
} from './user.validation.js';
import { normalizeToUserRole } from './user.service.js';
import { UserRole } from '../../generated/prisma/index.js';

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

  it('accepts and normalizes FINANCE when creating, updating, or filtering users', () => {
    for (const role of ['FINANCE', 'FinanceOfficer', 'FINANCE_OFFICER']) {
      expect(roleEnum.safeParse(role).success).toBe(true);
      expect(
        createUserSchema.safeParse({
          name: 'Finance Officer',
          email: 'finance.staff@moa.gov.et',
          password: 'SecurePassword123!',
          role,
        }).success,
      ).toBe(true);
      expect(updateUserSchema.safeParse({ role }).success).toBe(true);
      expect(normalizeToUserRole(role)).toBe(UserRole.FINANCE);
    }
  });
});
