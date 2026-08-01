import React, { useState } from 'react';
import { useTranslation } from '../services/translation';
import { MockDB, Invoice, Receipt, Tenant, Unit, AccountTransaction, Property } from '../services/db';
import {
  FiscalCycleState,
  DEFAULT_FISCAL_CYCLE,
  getFiscalDateRange
} from '../services/fiscalCycle';
import { filterRecordsByFiscalCycle } from '../services/mongoQueryHelper';
import FiscalCycleFilter from './FiscalCycleFilter';
import { FileText, Printer, Plus, Search, Check, ChevronDown, Landmark, Trash2, X, Tag } from 'lucide-react';

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function toBanglaNumerals(num: string | number): string {
  return String(num).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

export default function RentManager({ companyId }: { companyId: string }) {
  const { t, lang } = useTranslation();

  // Load state from DB
  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    MockDB.getTable<Invoice>('invoices').filter(i => i.companyId === companyId)
  );
  const [receipts, setReceipts] = useState<Receipt[]>(() => MockDB.getTable<Receipt>('receipts'));
  const [tenants] = useState<Tenant[]>(() => MockDB.getTable<Tenant>('tenants'));
  const [units] = useState<Unit[]>(() => MockDB.getTable<Unit>('units'));
  const [properties] = useState<Property[]>(() =>
    MockDB.getTable<Property>('properties').filter(p => p.companyId === companyId)
  );

  // Global Fiscal & Billing Cycle Filter State
  const [fiscalState, setFiscalState] = useState<FiscalCycleState>(DEFAULT_FISCAL_CYCLE);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'due'>('all');

  // Modals & Single Print
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isPrintingAll, setIsPrintingAll] = useState(false);

  // Input states for Manual Rent Invoice
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [billingMonth, setBillingMonth] = useState('July 2026');
  const [details, setDetails] = useState('');

  const handleTenantSelect = (id: string) => {
    setTenantId(id);
    const tenant = tenants.find(t => t.id === id);
    const unit = units.find(u => u.id === tenant?.unitId);
    if (unit) {
      setAmount(String(unit.rentAmount + 3000)); // Rent + Utilities default
      setDetails(`ভাড়া: ${unit.rentAmount.toLocaleString()}৳, ইউটিলিটি: ৩,০০০৳`);
    }
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!tenantId || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const newInvoice = MockDB.insert<Invoice>('invoices', {
      id: 'inv_' + Math.random().toString(36).substr(2, 9),
      companyId,
      unitId: tenant.unitId,
      tenantId,
      invoiceType: 'rent',
      amount: parsedAmount,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      billingMonth,
      status: 'pending',
      paidAmount: 0,
      details: details || 'ভাড়া এবং ইউটিলিটি বিলিং'
    });

    setInvoices(prev => [...prev, newInvoice]);
    setTenantId('');
    setAmount('');
    setDetails('');
    setShowAddForm(false);
  };

  const markAsPaidManually = (inv: Invoice) => {
    const method = prompt('Payment Method? (Cash / Bank / Cheque)', 'Cash');
    if (!method) return;

    MockDB.update<Invoice>('invoices', inv.id, {
      status: 'paid',
      paidAmount: inv.amount,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: method
    });

    const nextRcptNo = 'MR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    MockDB.insert<Receipt>('receipts', {
      id: 'rcpt_' + Math.random().toString(36).substr(2, 9),
      invoiceId: inv.id,
      receiptNumber: nextRcptNo,
      receivedAmount: inv.amount,
      receivedDate: new Date().toISOString().split('T')[0],
      receivedBy: 'Manager Accounts',
      paymentMethod: method,
      remarks: 'পরিশোধিত ক্যাশ কাউন্টার'
    });

    MockDB.insert<AccountTransaction>('transactions', {
      id: 'tx_' + Math.random().toString(36).substr(2, 9),
      companyId: inv.companyId,
      date: new Date().toISOString().split('T')[0],
      type: 'income',
      category: 'Rent Revenue',
      account: method === 'Cash' ? 'Cashbook' : 'Bank Account',
      amount: inv.amount,
      description: `ভাড়া আদায়: ${tenants.find(t => t.id === inv.tenantId)?.name || ''}`
    });

    setInvoices(MockDB.getTable<Invoice>('invoices').filter(i => i.companyId === companyId));
    setReceipts(MockDB.getTable<Receipt>('receipts'));
    alert('Bill Marked as Paid & Receipt Created!');
  };

  const handleDeleteInvoice = (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    MockDB.delete('invoices', id);
    setInvoices(MockDB.getTable<Invoice>('invoices').filter(i => i.companyId === companyId));
  };

  // Filter Logic using FiscalCycleFilter and search
  const cycleFilteredInvoices = filterRecordsByFiscalCycle(
    invoices,
    inv => inv.dueDate || inv.paymentDate || '2026-07-01',
    fiscalState,
    inv => {
      const u = units.find(unit => unit.id === inv.unitId);
      return u?.propertyId;
    }
  );

  const filteredInvoices = cycleFilteredInvoices.filter(inv => {
    const tenant = tenants.find(t => t.id === inv.tenantId);

    // Search by Name or Mobile
    const matchesSearch = tenant
      ? (tenant.name.toLowerCase().includes(search.toLowerCase()) || tenant.phone.includes(search))
      : true;

    // Status filter
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Totals calculations
  const totalReceivable = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCollected = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalDues = filteredInvoices.reduce((sum, inv) => sum + (inv.amount - inv.paidAmount), 0);

  const { startDate, endDate } = getFiscalDateRange(fiscalState);

  return (
    <div className="space-y-6 text-sm">
      
      {/* Header Bar */}
      <div className="no-print flex justify-between items-center mb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('rentMgmt')}</h2>
            <p className="text-xs text-slate-400">Generate rent ledgers, auto invoices, collect cash and print money receipts</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsPrintingAll(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-500" />
            {lang === 'bn' ? 'সকল বিল প্রিন্ট করুন' : 'Print All Receipts'}
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-500/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন বিল যোগ করুন
          </button>
        </div>
      </div>

      {/* Global Fiscal Cycle Filter Component */}
      <div className="no-print">
        <FiscalCycleFilter
          state={fiscalState}
          onChange={setFiscalState}
          properties={properties}
          showPropertySelector={true}
        />
      </div>

      {/* Manual Invoice Entry Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto no-print">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-in my-8">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-900">
                নতুন বিল যোগ করুন (Create Rent Invoice)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Select Tenant *</label>
                  <select
                    value={tenantId}
                    onChange={(e) => handleTenantSelect(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-800"
                    required
                  >
                    <option value="" className="bg-white">-- Choose Active Tenant --</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id} className="bg-white">
                        {t.name} ({units.find(u => u.id === t.unitId)?.number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">Billing Period / Month *</label>
                  <input
                    type="text"
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">Invoice Amount (BDT) *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-800"
                    placeholder="e.g. 35000"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">Details / Description</label>
                  <input
                    type="text"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-800"
                    placeholder="e.g. বাসা ভাড়া ও ইউটিলিটি চার্জ"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">সাইকেলের প্রাপ্য মোট ভাড়া</span>
            <h3 className="text-lg font-black text-slate-800">৳ {totalReceivable.toLocaleString()}</h3>
            <span className="text-[10px] text-slate-500">{startDate} ~ {endDate}</span>
          </div>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">আদায়কৃত ভাড়া</span>
            <h3 className="text-lg font-black text-emerald-500">৳ {totalCollected.toLocaleString()}</h3>
            <span className="text-[10px] text-emerald-500 font-bold">
              {totalReceivable > 0 ? Math.round((totalCollected / totalReceivable) * 100) : 0}% Collected
            </span>
          </div>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase">মোট বকেয়া ভাড়া</span>
            <h3 className="text-lg font-black text-rose-500">৳ {totalDues.toLocaleString()}</h3>
            <span className="text-[10px] text-rose-500 font-medium">তাগাদা প্রেরণ প্রয়োজন</span>
          </div>
          <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Search & Invoice Status Filters */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        
        {/* Search Tenant Name or Phone */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ভাড়াটিয়ার নাম বা মোবাইল নাম্বার..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none text-slate-800"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'paid', 'pending', 'due'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer uppercase ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? 'সব বিল' : st === 'paid' ? 'পরিশোধিত' : st === 'pending' ? 'আংশিক' : 'বকেয়া'}
            </button>
          ))}
        </div>

      </div>

      {/* Invoices List Table */}
      <div className="glass-panel rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">ইনভয়েস / টার্গেট</th>
                <th className="p-3">ভাড়াটিয়ার তথ্য</th>
                <th className="p-3">বিলিং সাইকেল & অ্যাডভান্স মোড</th>
                <th className="p-3 text-right">নির্ধারিত ভাড়া</th>
                <th className="p-3 text-right">আদায়কৃত</th>
                <th className="p-3 text-center">স্ট্যাটাস</th>
                <th className="p-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    নির্বাচিত সাইকেলে কোনো ভাড়া ইনভয়েস পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const tenant = tenants.find(t => t.id === inv.tenantId);
                  const unit = units.find(u => u.id === inv.unitId);
                  const prop = properties.find(p => p.id === unit?.propertyId);

                  // Detect Quarterly Advance payment vs Monthly tenant plan
                  const isQuarterlyAdvance = inv.amount >= 100000 || (tenant && tenant.moveInDate && parseInt(tenant.moveInDate.substring(0,4)) <= 2024);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-800">
                        <span>{unit?.number || 'Unit'}</span>
                        <span className="block text-[10px] text-slate-400 font-normal">{prop?.name || 'Property'}</span>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{tenant?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-slate-500">{tenant?.phone}</span>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-slate-700 block">{inv.billingMonth || fiscalState.period}</span>
                        {/* Status Indicator for Tenant Advance Structure */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          isQuarterlyAdvance
                            ? 'bg-purple-500/10 text-purple-600  border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-600  border border-blue-500/20'
                        }`}>
                          <Tag className="w-2.5 h-2.5" />
                          {isQuarterlyAdvance ? (lang === 'bn' ? 'ত্রৈমাসিক অগ্রিম পরিষদ' : 'Quarterly Advance') : (lang === 'bn' ? 'মাসিক নিয়মিত বিলিং' : 'Monthly Cycle')}
                        </span>
                      </td>

                      <td className="p-3 text-right font-extrabold text-slate-800">
                        ৳ {inv.amount.toLocaleString()}
                      </td>

                      <td className="p-3 text-right font-bold text-emerald-500">
                        ৳ {inv.paidAmount.toLocaleString()}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                          inv.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {inv.status === 'paid' ? 'পরিশোধিত' : inv.status === 'pending' ? 'আংশিক' : 'বকেয়া'}
                        </span>
                      </td>

                      <td className="p-3 text-right space-x-1">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => markAsPaidManually(inv)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                          >
                            পেমেন্ট গ্রহণ
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title="Delete invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
