import React, { useState } from 'react';
import { useTranslation } from '../services/translation';
import { MockDB, AccountTransaction, Property } from '../services/db';
import { FiscalCycleState, DEFAULT_FISCAL_CYCLE } from '../services/fiscalCycle';
import { filterRecordsByFiscalCycle } from '../services/mongoQueryHelper';
import FiscalCycleFilter from './FiscalCycleFilter';
import { BookOpen, Plus, Landmark, ArrowUpRight, ArrowDownRight, Calendar, FileText, Clipboard, X, Trash2 } from 'lucide-react';

export default function Accounting({ companyId }: { companyId: string }) {
  const { t } = useTranslation();

  // DB tables
  const [txs, setTxs] = useState<AccountTransaction[]>(() => 
    MockDB.getTable<AccountTransaction>('transactions').filter(t => t.companyId === companyId)
  );

  const [properties] = useState<Property[]>(() => 
    MockDB.getTable<Property>('properties').filter(p => p.companyId === companyId)
  );

  // Global Fiscal & Billing Cycle Filter State
  const [fiscalState, setFiscalState] = useState<FiscalCycleState>(DEFAULT_FISCAL_CYCLE);
  const [mobileTab, setMobileTab] = useState<'income' | 'expense'>('income');

  // Form State (Modal)
  const [showAddForm, setShowAddForm] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('Rent Revenue');
  const [account, setAccount] = useState('Cashbook');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [note, setNote] = useState('');

  // Filter transactions using Fiscal Cycle Filter State & Property Filter
  const filteredTxs = filterRecordsByFiscalCycle(
    txs,
    t => t.date,
    fiscalState,
    t => t.propertyId
  );

  const incomeTxs = filteredTxs.filter(t => t.type === 'income');
  const expenseTxs = filteredTxs.filter(t => t.type === 'expense');

  // Calculations
  const revenue = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const expense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const profit = revenue - expense;

  // Chart of accounts summary map
  const accountsMap = filteredTxs.reduce((acc, tx) => {
    if (!acc[tx.category]) acc[tx.category] = 0;
    acc[tx.category] += tx.type === 'income' ? tx.amount : -tx.amount;
    return acc;
  }, {} as Record<string, number>);

  const handleCreateTx = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amount);
    if (isNaN(val) || val <= 0 || !description.trim()) return;

    const newTx = MockDB.insert<AccountTransaction>('transactions', {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      companyId,
      date,
      type: txType,
      category,
      account,
      amount: val,
      description,
      propertyId,
      invoiceNo: invoiceNo.trim() || undefined,
      note: note.trim() || undefined
    });

    setTxs(prev => [newTx, ...prev]);
    setAmount('');
    setDescription('');
    setInvoiceNo('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowAddForm(false);
  };

  const handleDeleteTx = (id: string) => {
    MockDB.delete('transactions', id);
    setTxs(prev => prev.filter(t => t.id !== id));
  };

  const getPropertyName = (pId?: string) => {
    if (!pId) return 'General (সাধারণ)';
    const prop = properties.find(p => p.id === pId);
    return prop ? prop.name : 'General (সাধারণ)';
  };

  return (
    <div className="space-y-6 text-sm">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('accountingSystem')}</h2>
            <p className="text-xs text-slate-400">Chart of accounts, general cashbook ledger, double entry journals and profit-loss statements</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Petty Cash Entry Button (Triggers Modal) */}
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Petty Cash Entry
          </button>
        </div>
      </div>

      {/* Global Fiscal Cycle Filter Component */}
      <FiscalCycleFilter
        state={fiscalState}
        onChange={setFiscalState}
        properties={properties}
        showPropertySelector={true}
      />

      {/* MODAL DIALOG: Add Petty Cash Transaction */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-5 my-8 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                Add Petty Cash Transaction (নতুন ক্যাশ লেনদেন)
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTx} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Property Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Property (প্রোপার্টি) *</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium"
                  required
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Transaction Type */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Transaction Type</label>
                <select
                  value={txType}
                  onChange={(e: any) => {
                    setTxType(e.target.value);
                    setCategory(e.target.value === 'income' ? 'Rent Revenue' : 'Salary Expense');
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="income">Debit - Cash Inflow (আয়)</option>
                  <option value="expense">Credit - Cash Outflow (ব্যয়)</option>
                </select>
              </div>

              {/* Ledger Code */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Accounting Ledger Code</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium"
                >
                  {txType === 'income' ? (
                    <>
                      <option value="Rent Revenue">Rent Revenue (ভাড়া বাবদ আয়)</option>
                      <option value="Booking Revenue">Booking Revenue (বুকিং বাবদ আয়)</option>
                      <option value="Other Income">Other Income (অন্যান্য আয়)</option>
                    </>
                  ) : (
                    <>
                      <option value="Salary Expense">Salary Expense (কর্মচারী বেতন)</option>
                      <option value="Maintenance Cost">Maintenance Cost (রক্ষণাবেক্ষণ ব্যয়)</option>
                      <option value="Utility Expense">Utility Expense (ইউটিলিটি বিল)</option>
                      <option value="Office Rent">Office Rent / General Expense</option>
                    </>
                  )}
                </select>
              </div>

              {/* Payment Channel */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Channel</label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="Cashbook">Petty Cashbook (নগদ ক্যাশ)</option>
                  <option value="Bank Account">Bank Current Account (ব্যাংক হিসাব)</option>
                  <option value="bKash Merchant">bKash Wallet Merchant</option>
                  <option value="Nagad Merchant">Nagad Wallet Merchant</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Date (তারিখ) *
                </label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              {/* Invoice No */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Invoice / Memo No (ইনভয়েস নং)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. INV-2026-001"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Transaction Value (BDT) *</label>
                <input 
                  type="number" 
                  placeholder="e.g. 1500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              {/* Narration Description */}
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Memo Narration *</label>
                <input 
                  type="text" 
                  placeholder="e.g. অফিস পেপার ও চা নাস্তা ক্রয়"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>

              {/* Note / Comments */}
              <div className="md:col-span-3">
                <label className="text-[11px] font-bold text-slate-600 block mb-1 flex items-center gap-1">
                  <Clipboard className="w-3.5 h-3.5 text-slate-400" />
                  Note / Comments (অতিরিক্ত মন্তব্য)
                </label>
                <textarea 
                  placeholder="Enter details or comments about this transaction..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-indigo-500 font-medium resize-none"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="md:col-span-3 flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)} 
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/15 hover:shadow-lg transition-all cursor-pointer"
                >
                  Record Journal Double Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Financial Summaries Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block">Total Revenue (মোট আয়)</span>
            <p className="text-xl font-black text-emerald-500">৳ {revenue.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block">Total Expenses (মোট ব্যয়)</span>
            <p className="text-xl font-black text-rose-500">৳ {expense.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold block">Net Operating Profit (নিট ব্যালেন্স)</span>
            <p className="text-xl font-black text-indigo-500">৳ {profit.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Mobile Device Tab Switcher (< md screen size) */}
      <div className="flex md:hidden bg-slate-200 p-1 rounded-xl">
        <button
          onClick={() => setMobileTab('income')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            mobileTab === 'income'
              ? 'bg-emerald-500 text-white shadow-md'
              : 'text-slate-600 '
          }`}
        >
          আয় তালিকা ({incomeTxs.length})
        </button>
        <button
          onClick={() => setMobileTab('expense')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            mobileTab === 'expense'
              ? 'bg-rose-500 text-white shadow-md'
              : 'text-slate-600 '
          }`}
        >
          ব্যয় তালিকা ({expenseTxs.length})
        </button>
      </div>

      {/* Ledgers & Chart of Accounts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Income Ledger */}
        <div className={`glass-panel rounded-2xl p-5 border border-slate-200  ${
          mobileTab !== 'income' ? 'hidden md:block' : ''
        }`}>
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm flex items-center gap-2 text-emerald-500">
              <ArrowUpRight className="w-4 h-4" />
              Income Ledger (আয় তালিকা)
            </span>
            <span className="text-xs bg-emerald-500/10 text-emerald-500 font-bold px-2.5 py-1 rounded-full">
              {incomeTxs.length} Record(s)
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {incomeTxs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                নির্বাচিত মাসে কোনো আয়ের লেনদেন নেই।
              </div>
            ) : (
              incomeTxs.map(tx => (
                <div key={tx.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-500/30 transition-all space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">{tx.description}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{tx.category} • {tx.account}</span>
                    </div>
                    <span className="font-black text-emerald-500 text-xs">+৳ {tx.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-600 pt-1 border-t border-slate-100">
                    <span>{getPropertyName(tx.propertyId)}</span>
                    <div className="flex items-center gap-2">
                      <span>{tx.date}</span>
                      <button 
                        onClick={() => handleDeleteTx(tx.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Expense Ledger */}
        <div className={`glass-panel rounded-2xl p-5 border border-slate-200  ${
          mobileTab !== 'expense' ? 'hidden md:block' : ''
        }`}>
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm flex items-center gap-2 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
              Expense Ledger (ব্যয় তালিকা)
            </span>
            <span className="text-xs bg-rose-500/10 text-rose-400 font-bold px-2.5 py-1 rounded-full">
              {expenseTxs.length} Record(s)
            </span>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
            {expenseTxs.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                নির্বাচিত মাসে কোনো ব্যয়ের লেনদেন নেই।
              </div>
            ) : (
              expenseTxs.map(tx => (
                <div key={tx.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-rose-500/30 transition-all space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">{tx.description}</span>
                      <span className="text-[10px] text-rose-500 font-semibold">{tx.category} • {tx.account}</span>
                    </div>
                    <span className="font-black text-rose-500 text-xs">-৳ {tx.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-600 pt-1 border-t border-slate-100">
                    <span>{getPropertyName(tx.propertyId)}</span>
                    <div className="flex items-center gap-2">
                      <span>{tx.date}</span>
                      <button 
                        onClick={() => handleDeleteTx(tx.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-0.5"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Trial Balance & Chart of Accounts Summary */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm flex items-center gap-2 text-indigo-500">
              <Landmark className="w-4 h-4" />
              Trial Balance Cards (হিসাব বিবরণী)
            </span>
          </div>

          <div className="space-y-3">
            {Object.keys(accountsMap).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                কোনো হিসাব কোড ডাটা নেই।
              </div>
            ) : (
              Object.entries(accountsMap).map(([accName, val]) => (
                <div key={accName} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                  <span className="font-semibold text-xs text-slate-700">{accName}</span>
                  <span className={`font-extrabold text-xs ${val >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ৳ {Math.abs(val).toLocaleString()} {val >= 0 ? '(Cr)' : '(Dr)'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
