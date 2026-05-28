import { describe, expect, it } from 'vitest';
import { plaidToCoaId } from '@/lib/categorize';
import type { Coa } from '@/types/db';

const baseCoa = (overrides: Partial<Coa>): Coa => ({
  id: overrides.id ?? 'id-1',
  user_key: 'user',
  code: overrides.code ?? '9999',
  name: overrides.name ?? 'Test',
  type: overrides.type ?? 'expense',
  subtype: null,
  parent_id: null,
  description: overrides.description ?? null,
  plaid_keywords: overrides.plaid_keywords ?? null,
  is_active: overrides.is_active ?? true,
  is_system: overrides.is_system ?? false,
  created_at: '',
  updated_at: '',
});

describe('plaidToCoaId', () => {
  it('matches manual account via plaid_keywords before default code map', () => {
    const coa: Coa[] = [
      baseCoa({ id: 'sys-meals', code: '6040', name: 'Meals', is_system: true }),
      baseCoa({
        id: 'pet-care',
        code: '6150',
        name: 'Pet Care',
        plaid_keywords: ['pet', 'vet'],
      }),
    ];
    const id = plaidToCoaId('GENERAL_MERCHANDISE', 'PET_SUPPLIES', coa, 'CHEWY', 'Chewy order');
    expect(id).toBe('pet-care');
  });

  it('matches manual account by name when keywords overlap Plaid text', () => {
    const coa: Coa[] = [
      baseCoa({ id: 'childcare', code: '6200', name: 'Childcare', description: 'daycare and nanny' }),
    ];
    const id = plaidToCoaId(null, null, coa, 'BRIGHT HORIZONS', 'Bright Horizons daycare');
    expect(id).toBe('childcare');
  });

  it('falls back to seeded code mapping when no manual match', () => {
    const coa: Coa[] = [baseCoa({ id: 'meals', code: '6040', name: 'Meals', is_system: true })];
    const id = plaidToCoaId('FOOD_AND_DRINK', 'FOOD_AND_DRINK_RESTAURANT', coa);
    expect(id).toBe('meals');
  });

  it('ignores inactive accounts', () => {
    const coa: Coa[] = [
      baseCoa({ id: 'inactive', code: '6200', name: 'Pet Care', plaid_keywords: ['pet'], is_active: false }),
    ];
    const id = plaidToCoaId('PET', 'PET_SUPPLIES', coa);
    expect(id).toBeNull();
  });

  it('maps Plaid loan payment categories to Loan Payments (2510)', () => {
    const coa: Coa[] = [
      baseCoa({ id: 'loan-payments', code: '2510', name: 'Loan Payments', type: 'liability', is_system: true }),
    ];
    const id = plaidToCoaId('LOAN_PAYMENTS', 'LOAN_PAYMENTS_MORTGAGE_PAYMENT', coa);
    expect(id).toBe('loan-payments');
  });

  it('maps loan reimbursement text to Loan Reimbursements (4910)', () => {
    const coa: Coa[] = [
      baseCoa({
        id: 'loan-reimb',
        code: '4910',
        name: 'Loan Reimbursements',
        type: 'income',
        plaid_keywords: ['loan reimbursement', 'reimbursement'],
        is_system: true,
      }),
    ];
    const id = plaidToCoaId(null, null, coa, 'EMPLOYER', 'Loan reimbursement - March');
    expect(id).toBe('loan-reimb');
  });
});
