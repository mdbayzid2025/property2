import React from 'react';
import { FiscalCycleState, CycleMode, MONTH_NAMES_BN, QUARTERS_INFO, QuarterId, getFiscalDateRange } from '../services/fiscalCycle';
import { Property } from '../services/db';
import { useTranslation } from '../services/translation';
import { Calendar, Filter, Building, ChevronDown, Layers, Clock } from 'lucide-react';

interface FiscalCycleFilterProps {
  state: FiscalCycleState;
  onChange: (newState: FiscalCycleState) => void;
  properties?: Property[];
  showPropertySelector?: boolean;
  className?: string;
}

export default function FiscalCycleFilter({
  state,
  onChange,
  properties = [],
  showPropertySelector = true,
  className = ''
}: FiscalCycleFilterProps) {
  const { lang } = useTranslation();

  const handleYearChange = (yearStr: string) => {
    onChange({ ...state, year: parseInt(yearStr, 10) });
  };

  const handleModeChange = (mode: CycleMode) => {
    // Reset period based on new mode
    const defaultPeriod = mode === 'quarterly' ? 'Q3' : '7';
    onChange({ ...state, mode, period: defaultPeriod });
  };

  const handlePeriodChange = (period: string) => {
    onChange({ ...state, period });
  };

  const handlePropertyChange = (propertyId: string) => {
    onChange({ ...state, propertyId });
  };

  const toggleCustomRange = () => {
    const isCustom = !state.isCustomRange;
    const { startDate, endDate } = getFiscalDateRange(state);
    onChange({
      ...state,
      isCustomRange: isCustom,
      customStartDate: state.customStartDate || startDate,
      customEndDate: state.customEndDate || endDate
    });
  };

  const { startDate, endDate } = getFiscalDateRange(state);

  return (
    <div className={`glass-panel p-3.5 sm:p-4 rounded-2xl border border-slate-200  bg-white/80  backdrop-blur-md shadow-sm space-y-3 ${className}`}>
      
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Title & Active Date Badge */}
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                {lang === 'bn' ? 'অর্থবছর ও মাস ফিল্টার' : 'Fiscal & Monthly Filter'}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                {lang === 'bn' ? 'মাসিক হিসাব' : 'Monthly Accounting'}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>
                {lang === 'bn' ? 'তারিখ রেঞ্জ: ' : 'Date Range: '}
                <strong className="text-slate-700">{startDate}</strong> {lang === 'bn' ? 'থেকে' : 'to'} <strong className="text-slate-700">{endDate}</strong>
              </span>
            </p>
          </div>
        </div>

        {/* Right Section: Custom Date Range Toggle */}
        <button
          onClick={toggleCustomRange}
          className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ${
            state.isCustomRange
              ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
              : 'bg-slate-100  text-slate-600  border-slate-200  hover:bg-slate-200 '
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          {state.isCustomRange ? (lang === 'bn' ? 'কাস্টম ডেট অন' : 'Custom Range Active') : (lang === 'bn' ? 'কাস্টম তারিখ নির্বাচন' : 'Custom Date Range')}
        </button>
      </div>

      {/* Filter Controls Row */}
      {!state.isCustomRange ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 border-t border-slate-100">
          
          {/* 1. Fiscal Year Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-500" />
              {lang === 'bn' ? 'অর্থবছর (Fiscal Year)' : 'Fiscal Year'}
            </label>
            <select
              value={state.year}
              onChange={(e) => handleYearChange(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y} {lang === 'bn' ? 'অর্থবছর' : 'Fiscal Year'}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Month Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-teal-500" />
              {lang === 'bn' ? 'মাস নির্বাচন (Select Month)' : 'Select Month'}
            </label>
            <select
              value={state.period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">{lang === 'bn' ? 'সব মাস (পুরো বছর - ১২ মাস)' : 'All Months (Entire Year)'}</option>
              {MONTH_NAMES_BN.map((bnName, idx) => {
                const monthVal = (idx + 1).toString();
                return (
                  <option key={monthVal} value={monthVal}>
                    {lang === 'bn' ? `${bnName} (${state.year})` : `${MONTH_NAMES_BN[idx]} / ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx]} (${state.year})`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Property Selector */}
          {showPropertySelector && (
            <div className="flex flex-col">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-sky-500" />
                {lang === 'bn' ? 'প্রোপার্টি (Property)' : 'Property'}
              </label>
              <select
                value={state.propertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">{lang === 'bn' ? 'সব প্রোপার্টি (All Properties)' : 'All Properties'}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>
      ) : (
        /* Custom Date Picker Inputs */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              {lang === 'bn' ? 'শুরুর তারিখ (Start Date)' : 'Start Date'}
            </label>
            <input
              type="date"
              value={state.customStartDate || ''}
              onChange={(e) => onChange({ ...state, customStartDate: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">
              {lang === 'bn' ? 'শেষের তারিখ (End Date)' : 'End Date'}
            </label>
            <input
              type="date"
              value={state.customEndDate || ''}
              onChange={(e) => onChange({ ...state, customEndDate: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}

    </div>
  );
}
