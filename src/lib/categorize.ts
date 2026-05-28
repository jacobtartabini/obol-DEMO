/**
 * Rule-based mapper from Plaid category taxonomy to the user's Chart of Accounts.
 *
 * Resolution order:
 * 1. User-configured `plaid_keywords` on any COA account (manual or system)
 * 2. Fuzzy match on COA name / description (prefers non-system accounts)
 * 3. Plaid PFC → seeded CoA code map
 * 4. Legacy keyword → code fallbacks
 */
import type { Coa } from '@/types/db';

// Map of Plaid PFC keys (uppercase, snake_case) → CoA code in the seeded chart.
const PLAID_TO_COA_CODE: Record<string, string> = {
  INCOME: '4000',
  INCOME_WAGES: '4010',
  INCOME_DIVIDENDS: '4900',
  INCOME_INTEREST_EARNED: '4900',
  INCOME_RETIREMENT_PENSION: '4900',
  INCOME_TAX_REFUND: '4900',
  INCOME_UNEMPLOYMENT: '4900',
  INCOME_OTHER_INCOME: '4900',

  GENERAL_MERCHANDISE: '5000',
  GENERAL_MERCHANDISE_ONLINE_MARKETPLACES: '5000',
  GENERAL_MERCHANDISE_SUPERSTORES: '5000',

  ENTERTAINMENT: '6010',
  ENTERTAINMENT_TV_AND_MOVIES: '6010',
  ENTERTAINMENT_MUSIC_AND_AUDIO: '6010',
  ENTERTAINMENT_VIDEO_GAMES: '6010',

  GENERAL_MERCHANDISE_OFFICE_SUPPLIES: '6020',
  GENERAL_MERCHANDISE_ELECTRONICS: '6020',

  TRAVEL: '6030',
  TRAVEL_FLIGHTS: '6030',
  TRAVEL_LODGING: '6030',
  TRAVEL_TAXIS_AND_RIDE_SHARES: '6030',
  TRAVEL_PUBLIC_TRANSIT: '6030',
  TRAVEL_RENTAL_CARS: '6030',
  TRAVEL_GAS: '6030',
  TRAVEL_PARKING: '6030',
  TRAVEL_TOLLS: '6030',
  TRANSPORTATION: '6030',
  TRANSPORTATION_GAS: '6030',
  TRANSPORTATION_PUBLIC_TRANSIT: '6030',
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: '6030',

  FOOD_AND_DRINK: '6040',
  FOOD_AND_DRINK_RESTAURANT: '6040',
  FOOD_AND_DRINK_RESTAURANTS: '6040',
  FOOD_AND_DRINK_FAST_FOOD: '6040',
  FOOD_AND_DRINK_COFFEE: '6040',
  FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR: '6040',
  FOOD_AND_DRINK_GROCERIES: '6040',

  GENERAL_SERVICES: '6050',
  GENERAL_SERVICES_CONSULTING_AND_LEGAL: '6050',
  GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING: '6050',
  GENERAL_SERVICES_OTHER_GENERAL_SERVICES: '6050',
  PROFESSIONAL_SERVICES: '6050',

  GENERAL_SERVICES_ADVERTISING_AND_MARKETING: '6060',

  BANK_FEES: '6070',
  BANK_FEES_ATM_FEES: '6070',
  BANK_FEES_FOREIGN_TRANSACTION_FEES: '6070',
  BANK_FEES_INSUFFICIENT_FUNDS: '6070',
  BANK_FEES_OVERDRAFT_FEES: '6070',
  BANK_FEES_OTHER_BANK_FEES: '6070',

  GENERAL_SERVICES_INSURANCE: '6080',
  INSURANCE: '6080',

  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: '6090',
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: '6090',
  RENT_AND_UTILITIES_TELEPHONE: '6090',
  RENT_AND_UTILITIES_WATER: '6090',
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT: '6090',
  RENT_AND_UTILITIES_OTHER_UTILITIES: '6090',
  UTILITIES: '6090',

  RENT_AND_UTILITIES: '6100',
  RENT_AND_UTILITIES_RENT: '6100',

  GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT: '7000',
  TAX: '7000',

  LOAN_PAYMENTS: '2510',
  LOAN_PAYMENTS_CAR_PAYMENT: '2510',
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: '2510',
  LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT: '2510',
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: '2510',
  LOAN_PAYMENTS_OTHER_PAYMENT: '2510',
};

const FALLBACK_KEYWORDS: Array<{ match: RegExp; code: string }> = [
  { match: /food|restaurant|coffee|grocer/i, code: '6040' },
  { match: /travel|flight|hotel|uber|lyft|taxi|airbnb/i, code: '6030' },
  { match: /gas|fuel|chevron|shell|exxon/i, code: '6030' },
  { match: /software|subscription|netflix|spotify|saas/i, code: '6010' },
  { match: /office|supplies|staples/i, code: '6020' },
  { match: /advertis|marketing|facebook ads|google ads/i, code: '6060' },
  { match: /legal|consult|account|lawyer/i, code: '6050' },
  { match: /insurance/i, code: '6080' },
  { match: /utility|electric|water|internet|telephone|verizon|comcast/i, code: '6090' },
  { match: /rent|lease/i, code: '6100' },
  { match: /tax/i, code: '7000' },
  { match: /atm|overdraft|bank fee/i, code: '6070' },
  { match: /payroll|wages|salary|deposit/i, code: '4010' },
  { match: /interest|dividend|refund/i, code: '4900' },
  { match: /loan reimbursement|reimbursement.*loan|loan repay|repayment received|loan credit|loan refund/i, code: '4910' },
  { match: /loan payment|mortgage payment|student loan|personal loan|auto loan payment/i, code: '2510' },
];

function normalize(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().toUpperCase().replace(/[\s-]+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

interface ScoredCoa {
  id: string;
  score: number;
  isSystem: boolean;
}

function scoreCoaAccount(
  account: Coa,
  haystack: string,
  plaidCategory: string,
  plaidDetailed: string,
): number {
  let score = 0;
  const hayLower = haystack.toLowerCase();
  const nameLower = account.name.toLowerCase();
  const descLower = (account.description ?? '').toLowerCase();

  for (const kw of account.plaid_keywords ?? []) {
    const k = kw.trim().toLowerCase();
    if (!k) continue;
    if (plaidDetailed.includes(k) || plaidCategory.includes(k) || hayLower.includes(k)) {
      score += 100;
    }
  }

  const nameTokens = tokenize(account.name);
  for (const tok of nameTokens) {
    if (tok.length < 3) continue;
    if (hayLower.includes(tok)) score += 15;
  }

  if (descLower) {
    for (const tok of tokenize(account.description ?? '')) {
      if (tok.length < 4) continue;
      if (hayLower.includes(tok)) score += 8;
    }
  }

  if (nameLower.length >= 4 && hayLower.includes(nameLower)) score += 25;

  return score;
}

function bestCoaByMetadata(
  coa: Coa[],
  category: string | null | undefined,
  categoryDetailed: string | null | undefined,
  merchant?: string | null,
  description?: string | null,
): string | null {
  const haystack = `${category ?? ''} ${categoryDetailed ?? ''} ${merchant ?? ''} ${description ?? ''}`;
  const plaidCategory = normalize(category);
  const plaidDetailed = normalize(categoryDetailed);

  const candidates = coa.filter((c) => c.is_active);
  const scored: ScoredCoa[] = candidates
    .map((c) => ({
      id: c.id,
      score: scoreCoaAccount(c, haystack, plaidCategory, plaidDetailed),
      isSystem: c.is_system,
    }))
    .filter((s) => s.score >= 8)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.isSystem !== b.isSystem) return a.isSystem ? 1 : -1;
      return 0;
    });

  return scored[0]?.id ?? null;
}

function resolveByPlaidCode(
  category: string | null | undefined,
  categoryDetailed: string | null | undefined,
  coa: Coa[],
): string | null {
  const byCode = new Map(coa.map((c) => [c.code, c.id]));

  const dKey = normalize(categoryDetailed);
  if (dKey && PLAID_TO_COA_CODE[dKey]) {
    const id = byCode.get(PLAID_TO_COA_CODE[dKey]);
    if (id) return id;
  }

  const cKey = normalize(category);
  if (cKey && PLAID_TO_COA_CODE[cKey]) {
    const id = byCode.get(PLAID_TO_COA_CODE[cKey]);
    if (id) return id;
  }

  const haystack = `${category ?? ''} ${categoryDetailed ?? ''}`;
  for (const { match, code } of FALLBACK_KEYWORDS) {
    if (match.test(haystack)) {
      const id = byCode.get(code);
      if (id) return id;
    }
  }

  return null;
}

/**
 * Resolve a Plaid transaction to a CoA id from the user's full chart (including manual accounts).
 */
export function plaidToCoaId(
  category: string | null | undefined,
  categoryDetailed: string | null | undefined,
  coa: Coa[],
  merchant?: string | null,
  description?: string | null,
): string | null {
  if (!coa.length) return null;

  const metadataMatch = bestCoaByMetadata(
    coa,
    category,
    categoryDetailed,
    merchant,
    description,
  );
  if (metadataMatch) return metadataMatch;

  return resolveByPlaidCode(category, categoryDetailed, coa);
}

export function isLikelyTransfer(
  category: string | null | undefined,
  categoryDetailed: string | null | undefined,
  name?: string | null,
): boolean {
  const d = normalize(categoryDetailed);
  const c = normalize(category);
  // Principal/mortgage/student loan payments are expenses with COA mapping, not generic transfers.
  if (
    (c === 'LOAN_PAYMENTS' || d.startsWith('LOAN_PAYMENTS_')) &&
    d !== 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT' &&
    !d.includes('CREDIT_CARD_PAYMENT')
  ) {
    return false;
  }
  if (
    d.startsWith('TRANSFER_') ||
    c === 'TRANSFER_IN' ||
    c === 'TRANSFER_OUT' ||
    c === 'TRANSFER' ||
    d === 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT' ||
    d.includes('CREDIT_CARD_PAYMENT')
  ) {
    return true;
  }
  const hay = `${category ?? ''} ${categoryDetailed ?? ''} ${name ?? ''}`.toLowerCase();
  return /\b(transfer|cc payment|credit card payment|autopay|payment thank you|online payment)\b/.test(
    hay,
  );
}
