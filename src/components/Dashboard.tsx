import React, { useState } from 'react';
import { useTranslation } from '../services/translation';
import { MockDB, Invoice, AccountTransaction, Tenant, Property, Unit } from '../services/db';
import {
  FiscalCycleState,
  DEFAULT_FISCAL_CYCLE,
  getCycleBreakdownPeriods,
  getPreviousPeriodState,
  getFiscalDateRange
} from '../services/fiscalCycle';
import { filterRecordsByFiscalCycle } from '../services/mongoQueryHelper';
import FiscalCycleFilter from './FiscalCycleFilter';
import {
  TrendingUp, TrendingDown, AlertCircle,
  FileText, ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';

export default function Dashboard({ companyId }: { companyId: string }) {
  const { t, lang } = useTranslation();

  // Load state from DB
  const invoices = MockDB.getTable<Invoice>('invoices');
  const txs = MockDB.getTable<AccountTransaction>('transactions').filter(t => t.companyId === companyId);
  const tenants = MockDB.getTable<Tenant>('tenants').filter(t => t.companyId === companyId);
  const properties = MockDB.getTable<Property>('properties').filter(p => p.companyId === companyId);
  const units = MockDB.getTable<Unit>('units');

  // Global Fiscal State
  const [fiscalState, setFiscalState] = useState<FiscalCycleState>(DEFAULT_FISCAL_CYCLE);

  // Multi-tenant isolation filter
  const filteredInvoices = invoices.filter(i => i.companyId === companyId);

  // Current selected cycle invoices & transactions
  const currentCycleInvoices = filterRecordsByFiscalCycle(
    filteredInvoices,
    i => i.dueDate || i.paymentDate || '2026-07-01',
    fiscalState,
    i => {
      const u = units.find(unit => unit.id === i.unitId);
      return u?.propertyId;
    }
  );

  const rentInvoices = currentCycleInvoices.filter(i => i.invoiceType === 'rent');
  const currentReceivable = rentInvoices.reduce((sum, i) => sum + i.amount, 0);
  const currentCollected = rentInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  const currentDue = rentInvoices.reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);

  // Previous cycle comparison stats
  const prevFiscalState = getPreviousPeriodState(fiscalState);
  const prevCycleInvoices = filterRecordsByFiscalCycle(
    filteredInvoices,
    i => i.dueDate || i.paymentDate || '2026-06-01',
    prevFiscalState,
    i => {
      const u = units.find(unit => unit.id === i.unitId);
      return u?.propertyId;
    }
  );

  const prevRentInvoices = prevCycleInvoices.filter(i => i.invoiceType === 'rent');
  const prevCollected = prevRentInvoices.reduce((sum, i) => sum + i.paidAmount, 0);
  
  // Percentage change calculation vs previous period
  const collectionDiff = currentCollected - prevCollected;
  const collectionPercentChange = prevCollected > 0 
    ? Math.round((collectionDiff / prevCollected) * 100) 
    : (currentCollected > 0 ? 100 : 0);

  // Filtered transactions for active cycle
  const currentCycleTxs = filterRecordsByFiscalCycle(
    txs,
    t => t.date,
    fiscalState,
    t => t.propertyId
  );

  const totalRevenue = currentCycleTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = currentCycleTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

  // Custom Effective Metrics
  const propIds = properties.map(p => p.id);
  const companyUnits = units.filter(u => propIds.includes(u.propertyId));
  const totalUnitsCount = companyUnits.length;
  const occupiedUnitsCount = companyUnits.filter(u => u.status === 'occupied').length;
  const occupancyRate = totalUnitsCount > 0 ? Math.round((occupiedUnitsCount / totalUnitsCount) * 100) : 0;
  const activeTenantsCount = tenants.filter(t => t.status === 'active').length;

  // Chart Breakdown Data (12 Months or 4 Quarters)
  const breakdownPeriods = getCycleBreakdownPeriods(fiscalState.year, fiscalState.mode);

  const chartData = breakdownPeriods.map(period => {
    const periodState: FiscalCycleState = {
      ...fiscalState,
      isCustomRange: true,
      customStartDate: period.startDate,
      customEndDate: period.endDate
    };

    const periodTxs = filterRecordsByFiscalCycle(
      txs,
      t => t.date,
      periodState,
      t => t.propertyId
    );

    const inc = periodTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const exp = periodTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return {
      label: period.shortLabel,
      fullLabel: period.label,
      income: inc,
      expense: exp,
      incomeK: Math.round(inc / 1000),
      expenseK: Math.round(exp / 1000)
    };
  });

  const maxIncomeVal = Math.max(...chartData.map(d => d.incomeK), 100);
  const maxExpenseVal = Math.max(...chartData.map(d => d.expenseK), 50);

  const { startDate, endDate } = getFiscalDateRange(fiscalState);

  return (
    <div className="space-y-6 animate-slide-in">

      {/* Global Fiscal Cycle Filter */}
      <FiscalCycleFilter
        state={fiscalState}
        onChange={setFiscalState}
        properties={properties}
        showPropertySelector={true}
      />

      {/* Quick Comparative Stats Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-sky-900/10 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-extrabold text-slate-800">
              {lang === 'bn' ? 'সাইকেল সাপেক্ষে তুলনা বিবরণী (' : 'Cycle Comparison: '}
              {fiscalState.mode === 'monthly' ? (lang === 'bn' ? 'চলতি মাস বনাম পূর্ববর্তী মাস' : 'Current Month vs Previous Month') : (lang === 'bn' ? 'চলতি কোয়ার্টার বনাম পূর্ববর্তী কোয়ার্টার' : 'Current Quarter vs Previous Quarter')}
              )
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {lang === 'bn' ? `পূর্ববর্তী সাইকেলে সংগৃহীত ছিল: ৳ ${prevCollected.toLocaleString()}` : `Previous period collection: ৳ ${prevCollected.toLocaleString()}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-bold">
          <span className={`px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm ${
            collectionDiff >= 0 
              ? 'bg-emerald-500/10 text-emerald-600  border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-600  border border-rose-500/20'
          }`}>
            {collectionDiff >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(collectionPercentChange)}% {collectionDiff >= 0 ? (lang === 'bn' ? 'বৃদ্ধি' : 'Increase') : (lang === 'bn' ? 'হ্রাস' : 'Decrease')}
          </span>
        </div>
      </div>

      {/* 6 Core Effective Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Receivable Rent Card */}
        <div className="glass-panel glass-card-hover rounded-2xl p-5 border border-slate-200 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">সাইকেলের প্রাপ্য ভাড়া</span>
            <h3 className="text-xl font-extrabold tracking-tight text-slate-800">৳ {currentReceivable.toLocaleString()}</h3>
            <span className="text-[10px] text-sky-500 font-medium">
              {startDate} ~ {endDate}
            </span>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Rent Collected Card */}
        <div className="glass-panel glass-card-hover rounded-2xl p-5 border border-slate-200 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">সাইকেলের ভাড়া আদায়</span>
            <h3 className="text-xl font-extrabold tracking-tight text-emerald-500">৳ {currentCollected.toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-500 font-bold">
              {lang === 'bn'
                ? `${currentReceivable > 0 ? Math.round((currentCollected / currentReceivable) * 100) : 0}% আদায় হয়েছে`
                : `${currentReceivable > 0 ? Math.round((currentCollected / currentReceivable) * 100) : 0}% Collected`}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Rent Due Card */}
        <div className="glass-panel glass-card-hover rounded-2xl p-5 border border-slate-200 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">সাইকেলের বকেয়া ভাড়া</span>
            <h3 className="text-xl font-extrabold tracking-tight text-rose-500">৳ {currentDue.toLocaleString()}</h3>
            <span className="text-[10px] text-rose-500 font-medium">
              {lang === 'bn' ? 'তাগাদা প্রয়োজন' : 'Action needed'}
            </span>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <AlertCircle className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Properties & Units Stats */}
        <div className="glass-panel glass-card-hover rounded-2xl p-5 border border-slate-200 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">মোট প্রোপার্টি ও ফ্ল্যাট</span>
            <h3 className="text-xl font-extrabold tracking-tight text-indigo-600">{properties.length} টি প্রোপার্টি</h3>
            <span className="text-[10px] text-slate-500 font-bold">
              সর্বমোট ফ্ল্যাট/ইউনিট: {totalUnitsCount} টি
            </span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Flat Occupancy Rate */}
        <div className="glass-panel glass-card-hover rounded-2xl p-5 border border-slate-200 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">ফ্ল্যাট অকুপেন্সি রেট</span>
            <h3 className="text-xl font-extrabold tracking-tight text-teal-600">{occupancyRate}%</h3>
            <span className="text-[10px] text-slate-500 font-bold">
              ভাড়া হয়েছে: {occupiedUnitsCount} / {totalUnitsCount} টি ফ্ল্যাট
            </span>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-500 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Active Tenants */}
        <div className="glass-panel glass-card-hover rounded-2xl p-5 border border-slate-200 flex justify-between items-center shadow-sm">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">সক্রিয় ভাড়াটিয়া সংখ্যা</span>
            <h3 className="text-xl font-extrabold tracking-tight text-cyan-600">{activeTenantsCount} জন</h3>
            <span className="text-[10px] text-slate-500 font-medium">
              সক্রিয় কন্ট্যাক্ট চুক্তির সংখ্যা
            </span>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Dynamic 2 Charts Side-by-Side (Breakdown Mode: 12 Months vs 4 Quarters) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Income Chart Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm flex items-center gap-2 text-sky-400">
              <TrendingUp className="w-4 h-4" />
              {t('revenueAnalytics')} ({fiscalState.mode === 'monthly' ? (lang === 'bn' ? '১২ মাসের ব্রেকডাউন' : '12 Months Breakdown') : (lang === 'bn' ? '৪ কোয়ার্টারের ব্রেকডাউন' : '4 Quarters Breakdown')})
            </span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-semibold">
              {lang === 'bn' ? 'মোট সংগৃহীত: ' : 'Total Collected: '}৳{totalRevenue.toLocaleString()}
            </span>
          </div>

          <div className="h-56 flex items-end justify-between px-2 pt-6 border-b border-slate-200 relative">

            {/* background grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
              <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
              <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
              <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
            </div>

            {chartData.map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1 group relative z-10 mx-0.5">
                {/* Tooltip */}
                <div className="absolute -top-10 bg-slate-800 text-white text-[9px] p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none shadow-lg whitespace-nowrap">
                  {d.fullLabel}: ৳{d.income.toLocaleString()}
                </div>
                {/* Bar Value Label */}
                <span className="text-[9px] font-bold text-emerald-600 mb-1 select-none">
                  ৳{d.incomeK}k
                </span>
                {/* Visual Bar */}
                <div className="flex items-end h-36 w-full max-w-[32px] bg-slate-100 rounded-t-lg overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 to-sky-400 group-hover:from-emerald-400 group-hover:to-sky-300 transition-all duration-300 rounded-t-lg"
                    style={{ height: `${Math.min(100, Math.max(5, (d.incomeK / maxIncomeVal) * 100))}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 font-semibold truncate max-w-full">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Chart Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm flex items-center gap-2 text-rose-400">
              <TrendingDown className="w-4 h-4" />
              {t('expenseAnalytics')} ({fiscalState.mode === 'monthly' ? (lang === 'bn' ? '১২ মাসের ব্রেকডাউন' : '12 Months Breakdown') : (lang === 'bn' ? '৪ কোয়ার্টারের ব্রেকডাউন' : '4 Quarters Breakdown')})
            </span>
            <span className="text-xs bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full font-semibold">
              {lang === 'bn' ? 'মোট ব্যয়: ' : 'Total Expense: '}৳{totalExpense.toLocaleString()}
            </span>
          </div>

          <div className="h-56 flex items-end justify-between px-2 pt-6 border-b border-slate-200 relative">

            {/* background grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
              <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
              <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
              <div className="border-b border-dashed border-slate-200 w-full h-0"></div>
            </div>

            {chartData.map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1 group relative z-10 mx-0.5">
                {/* Tooltip */}
                <div className="absolute -top-10 bg-slate-800 text-white text-[9px] p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none shadow-lg whitespace-nowrap">
                  {d.fullLabel}: ৳{d.expense.toLocaleString()}
                </div>
                {/* Bar Value Label */}
                <span className="text-[9px] font-bold text-rose-600 mb-1 select-none">
                  ৳{d.expenseK}k
                </span>
                {/* Visual Bar */}
                <div className="flex items-end h-36 w-full max-w-[32px] bg-slate-100 rounded-t-lg overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-rose-500 to-amber-500 group-hover:from-rose-400 group-hover:to-amber-400 transition-all duration-300 rounded-t-lg"
                    style={{ height: `${Math.min(100, Math.max(5, (d.expenseK / maxExpenseVal) * 100))}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-slate-400 mt-2 font-semibold truncate max-w-full">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
