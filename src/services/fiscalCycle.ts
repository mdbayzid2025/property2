export type CycleMode = 'monthly' | 'quarterly';

export type QuarterId = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface FiscalCycleState {
  year: number; // e.g. 2026
  mode: CycleMode; // 'monthly' | 'quarterly'
  period: string; // '1'..'12' or 'Q1'..'Q4' or 'all'
  propertyId: string; // '' for all properties
  customStartDate?: string;
  customEndDate?: string;
  isCustomRange?: boolean;
}

export interface PeriodBreakdown {
  id: string;
  label: string;
  shortLabel: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  months: number[]; // 1-indexed month numbers
}

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_SHORT_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const MONTH_NAMES_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const QUARTERS_INFO: Record<QuarterId, { labelBn: string; labelEn: string; months: number[] }> = {
  Q1: { labelBn: 'Q1 (জানুয়ারি – মার্চ)', labelEn: 'Q1 (Jan – Mar)', months: [1, 2, 3] },
  Q2: { labelBn: 'Q2 (এপ্রিল – জুন)', labelEn: 'Q2 (Apr – Jun)', months: [4, 5, 6] },
  Q3: { labelBn: 'Q3 (জুলাই – সেপ্টেম্বর)', labelEn: 'Q3 (Jul – Sep)', months: [7, 8, 9] },
  Q4: { labelBn: 'Q4 (অক্টোবর – ডিসেম্বর)', labelEn: 'Q4 (Oct – Dec)', months: [10, 11, 12] },
};

export const DEFAULT_FISCAL_CYCLE: FiscalCycleState = {
  year: 2026,
  mode: 'monthly',
  period: '7', // Default to July (current active demo month)
  propertyId: '',
  isCustomRange: false
};

/**
 * Get start and end date (YYYY-MM-DD) for a given fiscal cycle state.
 */
export function getFiscalDateRange(state: FiscalCycleState): { startDate: string; endDate: string } {
  if (state.isCustomRange && state.customStartDate && state.customEndDate) {
    return { startDate: state.customStartDate, endDate: state.customEndDate };
  }

  const year = state.year || 2026;

  if (state.mode === 'quarterly') {
    if (state.period === 'Q1') {
      return { startDate: `${year}-01-01`, endDate: `${year}-03-31` };
    }
    if (state.period === 'Q2') {
      return { startDate: `${year}-04-01`, endDate: `${year}-06-30` };
    }
    if (state.period === 'Q3') {
      return { startDate: `${year}-07-01`, endDate: `${year}-09-30` };
    }
    if (state.period === 'Q4') {
      return { startDate: `${year}-10-01`, endDate: `${year}-12-31` };
    }
    // 'all' quarters
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }

  // Monthly mode
  if (state.period && state.period !== 'all') {
    const monthNum = parseInt(state.period, 10);
    if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      const mm = monthNum.toString().padStart(2, '0');
      const lastDay = new Date(year, monthNum, 0).getDate();
      return {
        startDate: `${year}-${mm}-01`,
        endDate: `${year}-${mm}-${lastDay.toString().padStart(2, '0')}`
      };
    }
  }

  // Entire year
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
}

/**
 * Returns breakdown list of 12 months or 4 quarters for aggregation charts and summary reports.
 */
export function getCycleBreakdownPeriods(year: number, mode: CycleMode): PeriodBreakdown[] {
  if (mode === 'quarterly') {
    return [
      { id: 'Q1', label: 'Q1 (Jan–Mar)', shortLabel: 'Q1', startDate: `${year}-01-01`, endDate: `${year}-03-31`, months: [1, 2, 3] },
      { id: 'Q2', label: 'Q2 (Apr–Jun)', shortLabel: 'Q2', startDate: `${year}-04-01`, endDate: `${year}-06-30`, months: [4, 5, 6] },
      { id: 'Q3', label: 'Q3 (Jul–Sep)', shortLabel: 'Q3', startDate: `${year}-07-01`, endDate: `${year}-09-30`, months: [7, 8, 9] },
      { id: 'Q4', label: 'Q4 (Oct–Dec)', shortLabel: 'Q4', startDate: `${year}-10-01`, endDate: `${year}-12-31`, months: [10, 11, 12] }
    ];
  }

  // Monthly mode: 12 periods
  return Array.from({ length: 12 }, (_, i) => {
    const monthNum = i + 1;
    const mm = monthNum.toString().padStart(2, '0');
    const lastDay = new Date(year, monthNum, 0).getDate();
    return {
      id: monthNum.toString(),
      label: MONTH_NAMES_EN[i],
      shortLabel: MONTH_SHORT_EN[i],
      startDate: `${year}-${mm}-01`,
      endDate: `${year}-${mm}-${lastDay.toString().padStart(2, '0')}`,
      months: [monthNum]
    };
  });
}

/**
 * Gets previous period state for comparing stats (e.g. Q3 vs Q2, or Jul vs Jun)
 */
export function getPreviousPeriodState(state: FiscalCycleState): FiscalCycleState {
  const year = state.year;
  if (state.mode === 'quarterly') {
    if (state.period === 'Q4') return { ...state, period: 'Q3' };
    if (state.period === 'Q3') return { ...state, period: 'Q2' };
    if (state.period === 'Q2') return { ...state, period: 'Q1' };
    if (state.period === 'Q1') return { ...state, year: year - 1, period: 'Q4' };
  } else {
    const monthNum = parseInt(state.period, 10);
    if (!isNaN(monthNum)) {
      if (monthNum === 1) return { ...state, year: year - 1, period: '12' };
      return { ...state, period: (monthNum - 1).toString() };
    }
  }
  return { ...state, year: year - 1 };
}
