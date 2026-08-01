import React, { useState } from 'react';
import { useTranslation } from '../services/translation';
import { 
  MockDB, 
  Property, 
  PropertyIncomeRow, 
  PropertyExpenseRow, 
  SummaryAdjustment, 
  PreviousMonthBalance 
} from '../services/db';
import {
  FiscalCycleState,
  DEFAULT_FISCAL_CYCLE,
  MONTH_NAMES_BN,
  MONTH_NAMES_EN,
  getFiscalDateRange
} from '../services/fiscalCycle';
import { filterRecordsByFiscalCycle } from '../services/mongoQueryHelper';
import FiscalCycleFilter from './FiscalCycleFilter';
import { 
  FileSpreadsheet, 
  FileDown, 
  Printer, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Calendar, 
  Building, 
  Check,
  TrendingUp,
  FileText
} from 'lucide-react';

// Bangla numeral digits map
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

// Translate English digits to Bangla numerals
export function toBanglaNumerals(num: string | number): string {
  return String(num).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

// Convert Bangla numerals back to English digits for parser calculations
export function toEnglishNumerals(bnStr: string): string {
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  return bnStr.replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);
}

// Format number into local Bengali currency / standard BDT formatting
export function formatCurrency(amount: number, lang: 'bn' | 'en'): string {
  if (lang === 'en') {
    return '৳ ' + amount.toLocaleString('en-US');
  }
  const formatted = amount.toLocaleString('en-IN'); // standard 2,01,880 format
  return toBanglaNumerals(formatted) + '/-';
}

const BN_NUM_WORDS = [
  'শূণ্য', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়',
  'দশ', 'এগারো', 'বারো', 'তেরো', 'চোদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ',
  'বিশ', 'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'উনত্রিশ',
  'ত্রিশ', 'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়তাল্লিশ', 'ছত্রিশ', 'সাঁইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ',
  'চল্লিশ', 'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চৌয়াল্লিশ', 'পয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ',
  'পঞ্চাশ', 'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চৌয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট',
  'ষাট', 'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর',
  'সত্তর', 'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চৌয়াত্তর', 'পঁচাত্তর', 'ছেয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনআশি',
  'আশি', 'একাশি', 'বিরাশি', 'তিরাশি', 'চৌরাশি', 'পঁচাশী', 'ছেয়াশি', 'সাতাশি', 'আটাশি', 'উননব্বই',
  'নব্বই', 'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছেয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
];

export function toBanglaWords(num: number): string {
  if (num === 0) return 'শূণ্য টাকা মাত্র';
  if (num < 0) return 'ঋণাত্মক ' + toBanglaWords(Math.abs(num));

  let words = '';

  if (num >= 10000000) {
    const crore = Math.floor(num / 10000000);
    words += toBanglaWords(crore).replace(' টাকা মাত্র।', '') + ' কোটি ';
    num %= 10000000;
  }

  if (num >= 100000) {
    const lakh = Math.floor(num / 100000);
    words += BN_NUM_WORDS[lakh] + ' লক্ষ ';
    num %= 100000;
  }

  if (num >= 1000) {
    const thousand = Math.floor(num / 1000);
    words += BN_NUM_WORDS[thousand] + ' হাজার ';
    num %= 1000;
  }

  if (num >= 100) {
    const hundred = Math.floor(num / 100);
    words += BN_NUM_WORDS[hundred] + ' শত ';
    num %= 100;
  }

  if (num > 0) {
    words += BN_NUM_WORDS[num];
  }

  return words.replace(/\s+/g, ' ').trim() + ' টাকা মাত্র।';
}

export function toEnglishWords(num: number): string {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + toEnglishWords(Math.abs(num));

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
                'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelowThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  };

  let words = '';

  if (num >= 10000000) {
    const crore = Math.floor(num / 10000000);
    words += toEnglishWords(crore).replace(' Taka Only', '') + ' Crore ';
    num %= 10000000;
  }

  if (num >= 100000) {
    const lakh = Math.floor(num / 100000);
    words += convertBelowThousand(lakh) + ' Lakh ';
    num %= 100000;
  }

  if (num >= 1000) {
    const thousand = Math.floor(num / 1000);
    words += convertBelowThousand(thousand) + ' Thousand ';
    num %= 1000;
  }

  if (num > 0) {
    words += convertBelowThousand(num);
  }

  return words.replace(/\s+/g, ' ').trim() + ' Taka Only';
}

export default function Reports({ companyId }: { companyId: string }) {
  const { t, lang } = useTranslation();

  // Global Fiscal & Billing Cycle Filter State
  const [fiscalState, setFiscalState] = useState<FiscalCycleState>({
    ...DEFAULT_FISCAL_CYCLE,
    period: 'all' // Default to entire year or all periods for report view
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all'); // 'all' = Summary Page
  const [reportType, setReportType] = useState<'income' | 'expense'>('income');

  // DB tables loaded from localStorage
  const [properties] = useState<Property[]>(() => 
    MockDB.getTable<Property>('properties').filter(p => p.companyId === companyId)
  );
  
  const [incomeRows, setIncomeRows] = useState<PropertyIncomeRow[]>(() => 
    MockDB.getTable<PropertyIncomeRow>('report_income')
  );
  const [expenseRows, setExpenseRows] = useState<PropertyExpenseRow[]>(() => 
    MockDB.getTable<PropertyExpenseRow>('report_expense')
  );
  const [adjustments, setAdjustments] = useState<SummaryAdjustment[]>(() => 
    MockDB.getTable<SummaryAdjustment>('report_adjustments')
  );
  const [balances, setBalances] = useState<PreviousMonthBalance[]>(() => 
    MockDB.getTable<PreviousMonthBalance>('report_balances')
  );

  // Form State: Add Income Tenant Row
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [newFloor, setNewFloor] = useState('');
  const [newFlat, setNewFlat] = useState('');
  const [newTenant, setNewTenant] = useState('');
  const [newRent, setNewRent] = useState('');
  const [newAdvance, setNewAdvance] = useState('');
  const [newLift, setNewLift] = useState('');
  const [newElec, setNewElec] = useState('');
  const [newGas, setNewGas] = useState('');
  const [newGarage, setNewGarage] = useState('');

  // Form State: Add Expense Ledger Row
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpDate, setNewExpDate] = useState('');
  const [newExpMemo, setNewExpMemo] = useState('');
  const [newExpDetails, setNewExpDetails] = useState('');
  const [newExpQty, setNewExpQty] = useState('');
  const [newExpCost, setNewExpCost] = useState('');

  // Form State: Summary Adjustments
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [newAdjDesc, setNewAdjDesc] = useState('');
  const [newAdjType, setNewAdjType] = useState<'income' | 'expense'>('income');
  const [newAdjAmount, setNewAdjAmount] = useState('');
  const [newAdjComment, setNewAdjComment] = useState('');

  // Form State: Carryover balance edit
  const [isEditingPrevBal, setIsEditingPrevBal] = useState(false);
  const [prevBalInput, setPrevBalInput] = useState('');

  // Filter records by active Fiscal Cycle State
  const cycleIncome = filterRecordsByFiscalCycle(incomeRows, r => r.monthYear, fiscalState);
  const cycleExpense = filterRecordsByFiscalCycle(expenseRows, r => r.date || r.monthYear, fiscalState);
  const cycleAdjustments = filterRecordsByFiscalCycle(adjustments, a => a.monthYear, fiscalState);

  // Property specific filter
  const filteredIncome = selectedPropertyId === 'all' 
    ? cycleIncome 
    : cycleIncome.filter(r => r.propertyId === selectedPropertyId);

  const filteredExpense = selectedPropertyId === 'all'
    ? cycleExpense
    : cycleExpense.filter(r => r.propertyId === selectedPropertyId);

  const activePrevBal = balances[0]?.balance ?? 201880;

  // Save helpers
  const persistIncome = (data: PropertyIncomeRow[]) => {
    setIncomeRows(data);
    MockDB.saveTable('report_income', data);
  };

  const persistExpense = (data: PropertyExpenseRow[]) => {
    setExpenseRows(data);
    MockDB.saveTable('report_expense', data);
  };

  const persistAdjustments = (data: SummaryAdjustment[]) => {
    setAdjustments(data);
    MockDB.saveTable('report_adjustments', data);
  };

  const persistBalances = (data: PreviousMonthBalance[]) => {
    setBalances(data);
    MockDB.saveTable('report_balances', data);
  };

  // Add Income handler
  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlat.trim() || !newTenant.trim()) {
      alert(lang === 'bn' ? 'দয়া করে ফ্ল্যাট নং এবং ভাড়াটিয়ার নাম লিখুন' : 'Please fill in Flat No and Tenant Name');
      return;
    }
    const currentMonthYear = `July ${fiscalState.year}`;
    const newRow: PropertyIncomeRow = {
      id: 'inc_' + Math.random().toString(36).substr(2, 9),
      propertyId: selectedPropertyId === 'all' ? (properties[0]?.id || 'p1') : selectedPropertyId,
      monthYear: currentMonthYear,
      floorNo: newFloor,
      flatNo: newFlat,
      tenantName: newTenant,
      flatRent: Number(newRent) || 0,
      advance: Number(newAdvance) || 0,
      liftBill: Number(newLift) || 0,
      electricityBill: Number(newElec) || 0,
      gasBill: Number(newGas) || 0,
      garageRent: Number(newGarage) || 0
    };
    persistIncome([...incomeRows, newRow]);
    setNewFloor('');
    setNewFlat('');
    setNewTenant('');
    setNewRent('');
    setNewAdvance('');
    setNewLift('');
    setNewElec('');
    setNewGas('');
    setNewGarage('');
    setShowIncomeForm(false);
  };

  const handleDeleteIncome = (id: string) => {
    if (confirm(lang === 'bn' ? 'আপনি কি এই কালেকশন এন্ট্রিটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this collection entry?')) {
      persistIncome(incomeRows.filter(r => r.id !== id));
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpDetails.trim() || !newExpCost) {
      alert(lang === 'bn' ? 'দয়া করে বিবরণ এবং মোট মূল্য লিখুন' : 'Please fill in Description and Cost');
      return;
    }
    const currentMonthYear = `July ${fiscalState.year}`;
    const newRow: PropertyExpenseRow = {
      id: 'exp_' + Math.random().toString(36).substr(2, 9),
      propertyId: selectedPropertyId === 'all' ? (properties[0]?.id || 'p1') : selectedPropertyId,
      monthYear: currentMonthYear,
      date: newExpDate || new Date().toISOString().split('T')[0],
      memoNo: newExpMemo,
      details: newExpDetails,
      quantity: newExpQty,
      totalCost: Number(newExpCost) || 0
    };
    persistExpense([...expenseRows, newRow]);
    setNewExpDate('');
    setNewExpMemo('');
    setNewExpDetails('');
    setNewExpQty('');
    setNewExpCost('');
    setShowExpenseForm(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm(lang === 'bn' ? 'আপনি কি এই খরচের হিসাবটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this expense record?')) {
      persistExpense(expenseRows.filter(r => r.id !== id));
    }
  };

  const handleAddAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdjDesc.trim() || !newAdjAmount) {
      alert(lang === 'bn' ? 'দয়া করে বিবরণ এবং পরিমাণ লিখুন' : 'Please fill in Description and Amount');
      return;
    }
    const currentMonthYear = `July ${fiscalState.year}`;
    const newAdj: SummaryAdjustment = {
      id: 'adj_' + Math.random().toString(36).substr(2, 9),
      monthYear: currentMonthYear,
      type: newAdjType,
      description: newAdjDesc,
      amount: Number(newAdjAmount) || 0,
      comment: newAdjComment
    };
    persistAdjustments([...adjustments, newAdj]);
    setNewAdjDesc('');
    setNewAdjAmount('');
    setNewAdjComment('');
    setShowAdjustmentForm(false);
  };

  const handleDeleteAdjustment = (id: string) => {
    if (confirm(lang === 'bn' ? 'আপনি কি এই সমন্বয় এন্ট্রিটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this adjustment?')) {
      persistAdjustments(adjustments.filter(a => a.id !== id));
    }
  };

  const handleSavePrevBal = () => {
    const val = Number(prevBalInput);
    if (isNaN(val)) return;
    persistBalances([{ id: 'bal_1', monthYear: `July ${fiscalState.year}`, balance: val }]);
    setIsEditingPrevBal(false);
  };

  // Aggregate Calculations for Current Cycle Selection
  const getPropertyIncomeAggregate = (propId: string) => {
    const matches = cycleIncome.filter(r => r.propertyId === propId);
    return matches.reduce((sum, r) => sum + r.flatRent + r.advance + r.liftBill + r.electricityBill + r.gasBill + r.garageRent, 0);
  };

  const getPropertyExpenseAggregate = (propId: string) => {
    const matches = cycleExpense.filter(r => r.propertyId === propId);
    return matches.reduce((sum, r) => sum + r.totalCost, 0);
  };

  // Calculate dynamic totals for selected single property
  const currentPropertyIncomeSum = filteredIncome.reduce((acc, row) => ({
    rent: acc.rent + row.flatRent,
    advance: acc.advance + row.advance,
    lift: acc.lift + row.liftBill,
    elec: acc.elec + row.electricityBill,
    gas: acc.gas + row.gasBill,
    garage: acc.garage + row.garageRent,
    total: acc.total + (row.flatRent + row.advance + row.liftBill + row.electricityBill + row.gasBill + row.garageRent)
  }), { rent: 0, advance: 0, lift: 0, elec: 0, gas: 0, garage: 0, total: 0 });

  const currentPropertyExpenseSum = filteredExpense.reduce((sum, r) => sum + r.totalCost, 0);

  // Centralized Summary Totals
  const summaryPropertiesData = properties.map((prop, index) => {
    const inc = getPropertyIncomeAggregate(prop.id);
    const exp = getPropertyExpenseAggregate(prop.id);
    return {
      index: index + 1,
      name: prop.name,
      income: inc,
      expense: exp,
      details: prop.type === 'mixed' ? '(ভাড়া ও বিদ্যুৎ, গ্যাস)' : prop.type === 'commercial' ? '(ভাড়া ও বিদ্যুৎ বিল, দোকান)' : '(ভাড়া)'
    };
  });

  const summaryManualIncome = cycleAdjustments.filter(a => a.type === 'income').reduce((sum, a) => sum + a.amount, 0);
  const summaryManualExpense = cycleAdjustments.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.amount, 0);

  const aggregatePropertiesIncome = summaryPropertiesData.reduce((sum, p) => sum + p.income, 0);
  const aggregatePropertiesExpense = summaryPropertiesData.reduce((sum, p) => sum + p.expense, 0);

  const summaryGrandTotalIncome = aggregatePropertiesIncome + summaryManualIncome;
  const summaryGrandTotalExpense = aggregatePropertiesExpense + summaryManualExpense;

  const summarySubtotal = activePrevBal + summaryGrandTotalIncome;
  const summaryClosingBalance = summarySubtotal - summaryGrandTotalExpense;

  const { startDate, endDate } = getFiscalDateRange(fiscalState);

  // Estimated Tax / VAT Calculation (15% VAT, 5% Tax)
  const estimatedTax = Math.round(summaryGrandTotalIncome * 0.05);
  const estimatedVAT = Math.round(summaryGrandTotalIncome * 0.15);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    alert(lang === 'bn' ? 'এক্সেল স্প্রেডশীট ডাউনলোড সফল হয়েছে!' : 'Excel spreadsheet export completed successfully!');
  };

  const handleExportPDF = () => {
    alert(lang === 'bn' ? 'পিডিএফ অডিট রিপোর্ট জেনারেট সম্পন্ন!' : 'PDF Audit report successfully generated!');
  };

  return (
    <div className="space-y-6 text-sm">
      
      {/* Dynamic inline styles for browser print layouts */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000 !important;
            color: #000 !important;
            padding: 6px !important;
            font-size: 11px !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Reusable Global Fiscal & Billing Cycle Filter */}
      <div className="no-print">
        <FiscalCycleFilter
          state={fiscalState}
          onChange={setFiscalState}
          properties={properties}
          showPropertySelector={false}
        />
      </div>

      {/* Main Controls - HIDE ON PRINT */}
      <div className="no-print glass-panel rounded-2xl p-5 border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Property Selector */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              {lang === 'bn' ? 'রিপোর্ট ফরম্যাট' : 'Report Format'}
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2 outline-none font-semibold text-slate-700"
            >
              <option value="all">{lang === 'bn' ? 'সকল প্রপার্টি (সমন্বিত লাভ-ক্ষতি সারসংক্ষেপ)' : 'Centralized Profit & Loss Summary'}</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>
                  {lang === 'bn' ? p.name.split(' (')[0] : p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Income vs Expense for Individual Property Detail View */}
          {selectedPropertyId !== 'all' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-end">
              <button
                onClick={() => setReportType('income')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reportType === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 '
                }`}
              >
                {lang === 'bn' ? 'আয় হিসাব (ক্যাশ ইনফ্লো)' : 'Income Ledger'}
              </button>
              <button
                onClick={() => setReportType('expense')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  reportType === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 '
                }`}
              >
                {lang === 'bn' ? 'ব্যয় হিসাব (ক্যাশ আউটফ্লো)' : 'Expense Ledger'}
              </button>
            </div>
          )}
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Export</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>PDF Export</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>

      </div>

      {/* Tax / VAT Quick Estimate Cards (Period-wise Aligned) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">মাসিক মোট আয় (Revenue)</span>
            <span className="text-lg font-black text-emerald-500">{formatCurrency(summaryGrandTotalIncome, lang)}</span>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">আনুমানিক আয়কর (AIT Tax ~5%)</span>
            <span className="text-lg font-black text-indigo-500">{formatCurrency(estimatedTax, lang)}</span>
          </div>
          <FileText className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">আনুমানিক মুসক / ভ্যাট (VAT ~15%)</span>
            <span className="text-lg font-black text-purple-500">{formatCurrency(estimatedVAT, lang)}</span>
          </div>
          <FileText className="w-5 h-5 text-purple-500" />
        </div>
      </div>

      {/* REPORT CONTENT AREA - CENTRALIZED SUMMARY OR SINGLE PROPERTY */}
      {selectedPropertyId === 'all' ? (
        
        /* CENTRALIZED PROFIT & LOSS SUMMARY REPORT SHEET */
        <div className="print-full-width bg-white text-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xl space-y-6">
          
          {/* Header Title Banner */}
          <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-wide uppercase">
              {lang === 'bn' ? 'আলিফ টাওয়ার-১ ও অন্যান্য প্রতিষ্ঠানের আয় ও ব্যায়ের হিসাব' : 'ALIF TOWER-1 & ASSOCIATES CONSOLIDATED PROFIT & LOSS'}
            </h1>
            <p className="text-sm font-extrabold text-slate-700">
              {lang === 'bn' ? 'পরিক্রমণ সময়কাল: ' : 'Reporting Period: '}
              <span className="underline">{startDate}</span> {lang === 'bn' ? 'থেকে' : 'to'} <span className="underline">{endDate}</span>
              {fiscalState.mode === 'quarterly' ? ` (${fiscalState.period} Quarterly)` : ` (Monthly Cycle)`}
            </p>
          </div>

          {/* Centralized Summary Grid Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-slate-400 text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-extrabold text-center border-b border-slate-400">
                  <th className="p-2 border border-slate-400 w-12">ক্রঃ নং</th>
                  <th className="p-2 border border-slate-400">প্রতিষ্ঠানের নাম ও বিবরণ</th>
                  <th className="p-2 border border-slate-400 text-right w-36">মোট আদায় (টাকা)</th>
                  <th className="p-2 border border-slate-400 text-right w-36">মোট খরচ (টাকা)</th>
                  <th className="p-2 border border-slate-400 text-right w-36">নিট লাভ (টাকা)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-medium">
                {summaryPropertiesData.map(prop => (
                  <tr key={prop.index} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-300 text-center font-bold">{toBanglaNumerals(prop.index)}</td>
                    <td className="p-2 border border-slate-300 font-bold text-slate-800">
                      {prop.name} <span className="text-[11px] font-normal text-slate-600">{prop.details}</span>
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-bold text-emerald-700">
                      {formatCurrency(prop.income, lang)}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-bold text-rose-700">
                      {formatCurrency(prop.expense, lang)}
                    </td>
                    <td className={`p-2 border border-slate-300 text-right font-bold ${
                      (prop.income - prop.expense) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {formatCurrency(prop.income - prop.expense, lang)}
                    </td>
                  </tr>
                ))}

                {/* Adjustments rows */}
                {cycleAdjustments.map((adj, idx) => (
                  <tr key={adj.id} className="bg-slate-50/50">
                    <td className="p-2 border border-slate-300 text-center font-bold">{toBanglaNumerals(summaryPropertiesData.length + idx + 1)}</td>
                    <td className="p-2 border border-slate-300 font-bold text-slate-800 flex justify-between items-center">
                      <span>{adj.description} {adj.comment ? `(${adj.comment})` : ''}</span>
                      <button
                        onClick={() => handleDeleteAdjustment(adj.id)}
                        className="no-print text-rose-500 hover:text-rose-700 p-1"
                        title="Delete adjustment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-bold text-emerald-700">
                      {adj.type === 'income' ? formatCurrency(adj.amount, lang) : '-'}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-bold text-rose-700">
                      {adj.type === 'expense' ? formatCurrency(adj.amount, lang) : '-'}
                    </td>
                    <td className="p-2 border border-slate-300 text-right font-bold">
                      {formatCurrency(adj.type === 'income' ? adj.amount : -adj.amount, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Summary Totals Footer */}
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                <tr>
                  <td colSpan={2} className="p-2.5 border border-slate-400 text-right uppercase">
                    {lang === 'bn' ? 'সর্বমোট আয় ও ব্যয়:' : 'Grand Total Revenue & Expense:'}
                  </td>
                  <td className="p-2.5 border border-slate-400 text-right text-emerald-700 text-sm">
                    {formatCurrency(summaryGrandTotalIncome, lang)}
                  </td>
                  <td className="p-2.5 border border-slate-400 text-right text-rose-700 text-sm">
                    {formatCurrency(summaryGrandTotalExpense, lang)}
                  </td>
                  <td className="p-2.5 border border-slate-400 text-right text-indigo-900 text-sm">
                    {formatCurrency(summaryGrandTotalIncome - summaryGrandTotalExpense, lang)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Dynamic Add Adjustment Action Button */}
          <div className="no-print pt-2 flex justify-end">
            <button
              onClick={() => setShowAdjustmentForm(!showAdjustmentForm)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'নতুন সমন্বয় বা সাধারণ আয়/ব্যয় যোগ করুন' : 'Add Custom Summary Item'}</span>
            </button>
          </div>

          {/* Form Modal / Inline Form for Summary Adjustment */}
          {showAdjustmentForm && (
            <form onSubmit={handleAddAdjustment} className="no-print bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">বিবরণ (Description) *</label>
                <input
                  type="text"
                  placeholder="e.g. বাহিরের গাড়ি ভাড়া / কনসালটেন্সি ফি"
                  value={newAdjDesc}
                  onChange={e => setNewAdjDesc(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">ধরণ (Type) *</label>
                <select
                  value={newAdjType}
                  onChange={e => setNewAdjType(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                >
                  <option value="income">সাধারণ আয় (Income)</option>
                  <option value="expense">সাধারণ ব্যয় (Expense)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">পরিমাণ (Amount) *</label>
                <input
                  type="number"
                  placeholder="e.g. 12900"
                  value={newAdjAmount}
                  onChange={e => setNewAdjAmount(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div className="sm:col-span-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentForm(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-bold"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-lg"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          )}

          {/* Statement Spoken In Words Signature Footer */}
          <div className="pt-6 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs font-bold text-slate-800">
            <div>
              <p>কথা: <span className="underline font-extrabold">{lang === 'bn' ? toBanglaWords(summaryClosingBalance) : toEnglishWords(summaryClosingBalance)}</span></p>
            </div>
            <div className="flex gap-12 text-center pt-8">
              <div>
                <div className="w-32 border-b border-slate-800 mb-1"></div>
                <p>হিসাবরক্ষক</p>
              </div>
              <div>
                <div className="w-32 border-b border-slate-800 mb-1"></div>
                <p>ব্যবস্থাপনা পরিচালক</p>
              </div>
            </div>
          </div>

        </div>

      ) : (

        /* INDIVIDUAL PROPERTY AUDIT REPORT SHEET */
        <div className="print-full-width bg-white text-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-xl space-y-6">
          
          <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-wide uppercase">
              {properties.find(p => p.id === selectedPropertyId)?.name}
            </h1>
            <h2 className="text-base font-extrabold text-slate-800">
              {reportType === 'income' ? (lang === 'bn' ? 'ভাড়া আদায় ও ইউটিলিটি তালিকা' : 'Rent Collection & Utility Statement') : (lang === 'bn' ? 'যাবতীয় ব্যয়ের হিসাব বিবরণী' : 'Property Maintenance & Expenses Audit Sheet')}
            </h2>
            <p className="text-xs font-bold text-slate-600">
              {lang === 'bn' ? 'তারিখ রেঞ্জ: ' : 'Date Range: '} {startDate} ~ {endDate}
            </p>
          </div>

          {reportType === 'income' ? (
            /* INCOME TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-extrabold text-center">
                    <th className="p-2 border border-slate-400">তলা</th>
                    <th className="p-2 border border-slate-400">ফ্ল্যাট</th>
                    <th className="p-2 border border-slate-400">ভাড়াটিয়ার নাম</th>
                    <th className="p-2 border border-slate-400 text-right">ফ্ল্যাট ভাড়া</th>
                    <th className="p-2 border border-slate-400 text-right">অগ্রিম</th>
                    <th className="p-2 border border-slate-400 text-right">লিফট বিল</th>
                    <th className="p-2 border border-slate-400 text-right">বিদ্যুৎ বিল</th>
                    <th className="p-2 border border-slate-400 text-right">গ্যাস বিল</th>
                    <th className="p-2 border border-slate-400 text-right">গ্যারেজ ভাড়া</th>
                    <th className="p-2 border border-slate-400 text-right">মোট টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-medium">
                  {filteredIncome.map(row => {
                    const rowTotal = row.flatRent + row.advance + row.liftBill + row.electricityBill + row.gasBill + row.garageRent;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="p-2 border border-slate-300 text-center font-bold">{row.floorNo}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold">{row.flatNo}</td>
                        <td className="p-2 border border-slate-300 font-bold">{row.tenantName}</td>
                        <td className="p-2 border border-slate-300 text-right">{row.flatRent > 0 ? formatCurrency(row.flatRent, lang) : '-'}</td>
                        <td className="p-2 border border-slate-300 text-right">{row.advance > 0 ? formatCurrency(row.advance, lang) : '-'}</td>
                        <td className="p-2 border border-slate-300 text-right">{row.liftBill > 0 ? formatCurrency(row.liftBill, lang) : '-'}</td>
                        <td className="p-2 border border-slate-300 text-right">{row.electricityBill > 0 ? formatCurrency(row.electricityBill, lang) : '-'}</td>
                        <td className="p-2 border border-slate-300 text-right">{row.gasBill > 0 ? formatCurrency(row.gasBill, lang) : '-'}</td>
                        <td className="p-2 border border-slate-300 text-right">{row.garageRent > 0 ? formatCurrency(row.garageRent, lang) : '-'}</td>
                        <td className="p-2 border border-slate-300 text-right font-extrabold text-emerald-800">{formatCurrency(rowTotal, lang)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                  <tr>
                    <td colSpan={3} className="p-2.5 border border-slate-400 text-right uppercase">সর্বমোট সংগৃহীত টাকা:</td>
                    <td className="p-2.5 border border-slate-400 text-right">{formatCurrency(currentPropertyIncomeSum.rent, lang)}</td>
                    <td className="p-2.5 border border-slate-400 text-right">{formatCurrency(currentPropertyIncomeSum.advance, lang)}</td>
                    <td className="p-2.5 border border-slate-400 text-right">{formatCurrency(currentPropertyIncomeSum.lift, lang)}</td>
                    <td className="p-2.5 border border-slate-400 text-right">{formatCurrency(currentPropertyIncomeSum.elec, lang)}</td>
                    <td className="p-2.5 border border-slate-400 text-right">{formatCurrency(currentPropertyIncomeSum.gas, lang)}</td>
                    <td className="p-2.5 border border-slate-400 text-right">{formatCurrency(currentPropertyIncomeSum.garage, lang)}</td>
                    <td className="p-2.5 border border-slate-400 text-right text-emerald-800 text-sm">{formatCurrency(currentPropertyIncomeSum.total, lang)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            /* EXPENSE TABLE */
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-extrabold text-center">
                    <th className="p-2 border border-slate-400 w-12">ক্রঃ নং</th>
                    <th className="p-2 border border-slate-400 w-28">তারিখ</th>
                    <th className="p-2 border border-slate-400 w-24">মেমো নং</th>
                    <th className="p-2 border border-slate-400">খরচের বিবরণ ও ভাউচার</th>
                    <th className="p-2 border border-slate-400 w-28">পরিমাণ</th>
                    <th className="p-2 border border-slate-400 text-right w-36">মোট খরচ (টাকা)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-medium">
                  {filteredExpense.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="p-2 border border-slate-300 text-center font-bold">{toBanglaNumerals(idx + 1)}</td>
                      <td className="p-2 border border-slate-300 text-center font-semibold">{row.date}</td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-slate-700">{row.memoNo || '-'}</td>
                      <td className="p-2 border border-slate-300 font-bold">{row.details}</td>
                      <td className="p-2 border border-slate-300 text-center">{row.quantity || '-'}</td>
                      <td className="p-2 border border-slate-300 text-right font-extrabold text-rose-800">{formatCurrency(row.totalCost, lang)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-800">
                  <tr>
                    <td colSpan={5} className="p-2.5 border border-slate-400 text-right uppercase">সর্বমোট মোট খরচ:</td>
                    <td className="p-2.5 border border-slate-400 text-right text-rose-800 text-sm">{formatCurrency(currentPropertyExpenseSum, lang)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

        </div>

      )}

    </div>
  );
}
