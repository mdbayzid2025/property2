import { FiscalCycleState, CycleMode, getFiscalDateRange } from './fiscalCycle';

export interface MongoMatchStage {
  $match: Record<string, any>;
}

export interface MongoGroupStage {
  $group: Record<string, any>;
}

/**
 * Builds a MongoDB Aggregation Pipeline $match stage object based on fiscal cycle state.
 */
export function buildFiscalMatchPipeline(
  dateField: string = 'date',
  state: FiscalCycleState,
  propertyIdField: string = 'propertyId'
): MongoMatchStage {
  const { startDate, endDate } = getFiscalDateRange(state);
  const match: Record<string, any> = {
    [dateField]: {
      $gte: startDate,
      $lte: endDate
    }
  };

  if (state.propertyId) {
    match[propertyIdField] = state.propertyId;
  }

  return { $match: match };
}

/**
 * Builds a MongoDB Aggregation Pipeline $group stage object for grouping by month or quarter.
 */
export function buildFiscalGroupPipeline(
  dateField: string = 'date',
  mode: CycleMode = 'monthly'
): MongoGroupStage {
  if (mode === 'quarterly') {
    return {
      $group: {
        _id: {
          year: { $year: { $toDate: `$${dateField}` } },
          quarter: {
            $switch: {
              branches: [
                { case: { $lte: [{ $month: { $toDate: `$${dateField}` } }, 3] }, then: 'Q1' },
                { case: { $lte: [{ $month: { $toDate: `$${dateField}` } }, 6] }, then: 'Q2' },
                { case: { $lte: [{ $month: { $toDate: `$${dateField}` } }, 9] }, then: 'Q3' }
              ],
              default: 'Q4'
            }
          }
        },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
          }
        },
        totalExpense: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
          }
        },
        count: { $sum: 1 }
      }
    };
  }

  // Monthly breakdown
  return {
    $group: {
      _id: {
        year: { $year: { $toDate: `$${dateField}` } },
        month: { $month: { $toDate: `$${dateField}` } }
      },
      totalRevenue: {
        $sum: {
          $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
        }
      },
      totalExpense: {
        $sum: {
          $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
        }
      },
      count: { $sum: 1 }
    }
  };
}

/**
 * Helper to normalize string dates (ISO, billingMonth like "July 2026", or "2026-07-15") into standard YYYY-MM-DD
 */
export function normalizeDateString(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  // Direct ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }

  // Handle month/year names like "July 2026", "June 2026", "April 2026"
  const monthMap: Record<string, string> = {
    january: '01', jan: '01',
    february: '02', feb: '02',
    march: '03', mar: '03',
    april: '04', apr: '04',
    may: '05',
    june: '06', jun: '06',
    july: '07', jul: '07',
    august: '08', aug: '08',
    september: '09', sep: '09',
    october: '10', oct: '10',
    november: '11', nov: '11',
    december: '12', dec: '12'
  };

  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length >= 2) {
    const mName = parts[0];
    const yearStr = parts[1];
    if (monthMap[mName] && /^\d{4}$/.test(yearStr)) {
      return `${yearStr}-${monthMap[mName]}-01`;
    }
  }

  return null;
}

/**
 * Filters any list of record objects against the given fiscal state.
 */
export function filterRecordsByFiscalCycle<T>(
  records: T[],
  dateExtractor: (r: T) => string | undefined,
  state: FiscalCycleState,
  propertyExtractor?: (r: T) => string | undefined
): T[] {
  const { startDate, endDate } = getFiscalDateRange(state);

  return records.filter(record => {
    // Property check
    if (state.propertyId && propertyExtractor) {
      const pId = propertyExtractor(record);
      if (pId && pId !== state.propertyId) {
        return false;
      }
    }

    const rawDate = dateExtractor(record);
    const normalized = normalizeDateString(rawDate);

    if (!normalized) {
      // If we cannot parse a date, check if month-year string includes period or year
      if (rawDate && rawDate.includes(state.year.toString())) {
        return true;
      }
      return true; // Fallback retain
    }

    return normalized >= startDate && normalized <= endDate;
  });
}
