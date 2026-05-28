import { describe, expect, it } from 'vitest';
import { coaForTransactionType, parsePlaidKeywordsInput } from '@/lib/coa';
import type { Coa } from '@/types/db';

const coa = (type: Coa['type'], code: string): Coa => ({
  id: code,
  user_key: 'u',
  code,
  name: code,
  type,
  subtype: null,
  parent_id: null,
  description: null,
  plaid_keywords: null,
  is_active: true,
  is_system: false,
  created_at: '',
  updated_at: '',
});

describe('coaForTransactionType', () => {
  it('returns expense accounts and Loan Payments for expense transactions', () => {
    const accounts = [
      coa('expense', '6000'),
      coa('income', '4000'),
      coa('asset', '1000'),
      coa('liability', '2510'),
    ];
    const result = coaForTransactionType('expense', accounts);
    expect(result.map((c) => c.code).sort()).toEqual(['2510', '6000']);
  });

  it('includes all active accounts for transfers', () => {
    const accounts = [coa('expense', '6000'), coa('income', '4000')];
    expect(coaForTransactionType('transfer', accounts)).toHaveLength(2);
  });
});

describe('parsePlaidKeywordsInput', () => {
  it('parses comma-separated keywords', () => {
    expect(parsePlaidKeywordsInput('pet, vet,  chewy')).toEqual(['pet', 'vet', 'chewy']);
  });

  it('returns null for empty input', () => {
    expect(parsePlaidKeywordsInput('  ,  ')).toBeNull();
  });
});
