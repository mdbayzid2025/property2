import React, { useState } from 'react';
import { useTranslation } from '../services/translation';
import { MockDB, Unit, Property, Tenant, Invoice } from '../services/db';
import { FiscalCycleState, DEFAULT_FISCAL_CYCLE } from '../services/fiscalCycle';
import { filterRecordsByFiscalCycle } from '../services/mongoQueryHelper';
import FiscalCycleFilter from './FiscalCycleFilter';
import { Zap, Plus, Trash2, Calendar, User, ShieldCheck, X } from 'lucide-react';

export default function UtilityManager({ companyId }: { companyId: string }) {
  const { t, lang } = useTranslation();

  // Load DB tables
  const [properties] = useState<Property[]>(() => 
    MockDB.getTable<Property>('properties').filter(p => p.companyId === companyId)
  );

  // Global Fiscal Cycle Filter State
  const [fiscalState, setFiscalState] = useState<FiscalCycleState>(DEFAULT_FISCAL_CYCLE);

  const [utilities, setUtilities] = useState<any[]>(() => MockDB.getTable<any>('utilities'));
  const [units] = useState<Unit[]>(() => MockDB.getTable<Unit>('units'));
  const [tenants] = useState<Tenant[]>(() => MockDB.getTable<Tenant>('tenants'));
  const [invoices, setInvoices] = useState<Invoice[]>(() => MockDB.getTable<Invoice>('invoices'));

  // Form State Modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [billingMonth, setBillingMonth] = useState('July 2026');

  // Electricity
  const [elecPrev, setElecPrev] = useState('');
  const [elecCurr, setElecCurr] = useState('');
  const [elecRate, setElecRate] = useState('12');

  // Gas
  const [gasType, setGasType] = useState<'fixed' | 'measured'>('fixed');
  const [gasFixed, setGasFixed] = useState('1080');
  const [gasPrev, setGasPrev] = useState('');
  const [gasCurr, setGasCurr] = useState('');
  const [gasRate, setGasRate] = useState('45');

  // Garage & Water
  const [garageBill, setGarageBill] = useState('0');
  const [waterBill, setWaterBill] = useState('500');

  // Selected Unit Info for Real-Time Onscreen Tenant Binding
  const selectedUnit = units.find(u => u.id === selectedUnitId);
  const activeTenant = selectedUnit ? tenants.find(t => t.unitId === selectedUnit.id && t.status === 'active') : null;

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) {
      alert('অনুগ্রহ করে একটি ফ্ল্যাট/ইউনিট নির্বাচন করুন!');
      return;
    }

    const ep = Number(elecPrev);
    const ec = Number(elecCurr);
    const er = Number(elecRate);
    if (isNaN(ep) || isNaN(ec) || isNaN(er) || ec < ep) {
      alert('বিদ্যুৎ মিটারের পূর্ববর্তী ও বর্তমান রিডিং সঠিক নয়!');
      return;
    }
    const elecBillAmount = (ec - ep) * er;

    let gasBillAmount = 0;
    let gp: number | undefined;
    let gc: number | undefined;
    let gr: number | undefined;

    if (gasType === 'fixed') {
      gasBillAmount = Number(gasFixed) || 0;
    } else {
      gp = Number(gasPrev);
      gc = Number(gasCurr);
      gr = Number(gasRate);
      if (isNaN(gp) || isNaN(gc) || isNaN(gr) || gc < gp) {
        alert('গ্যাস মিটারের পূর্ববর্তী ও বর্তমান রিডিং সঠিক নয়!');
        return;
      }
      gasBillAmount = (gc - gp) * gr;
    }

    const garage = Number(garageBill) || 0;
    const water = Number(waterBill) || 0;
    const totalUtility = elecBillAmount + gasBillAmount + garage + water;

    const targetPropertyId = selectedUnit ? selectedUnit.propertyId : (properties[0]?.id || 'p1');

    const newBill = {
      id: 'ut_' + Math.random().toString(36).substr(2, 9),
      unitId: selectedUnitId,
      propertyId: targetPropertyId,
      billingMonth,
      
      electricityPrev: ep,
      electricityCurr: ec,
      electricityRate: er,
      electricityBill: elecBillAmount,
      
      gasType,
      gasPrev: gp,
      gasCurr: gc,
      gasRate: gr,
      gasBill: gasBillAmount,
      
      garageBill: garage,
      waterBill: water,
      
      calculatedBill: totalUtility,
      status: 'billed'
    };

    MockDB.insert('utilities', newBill);

    if (activeTenant) {
      const baseRent = selectedUnit?.rentAmount || 0;
      const serviceCharge = selectedUnit?.serviceCharge || 0;

      const existingInvoice = invoices.find(i => 
        i.tenantId === activeTenant.id && 
        i.billingMonth === billingMonth && 
        i.invoiceType === 'rent'
      );

      const electricityText = `বিদ্যুৎ বিল (${ec - ep} ইউনিট): ৳${elecBillAmount}`;
      const gasText = gasType === 'fixed' ? `গ্যাস বিল: ৳${gasBillAmount}` : `গ্যাস বিল (${gc! - gp!} ইউনিট): ৳${gasBillAmount}`;
      const garageText = garage > 0 ? `, গ্যারেজ/পার্কিং: ৳${garage}` : '';
      const waterText = water > 0 ? `, পানি বিল: ৳${water}` : '';
      const billDetails = `${electricityText}, ${gasText}${garageText}${waterText}`;

      if (existingInvoice) {
        const updatedAmount = baseRent + serviceCharge + totalUtility;
        const updatedDetails = `ভাড়া: ৳${baseRent}, সার্ভিস চার্জ: ৳${serviceCharge}, ইউটিলিটি: ৳${totalUtility} (${billDetails})`;

        MockDB.update<Invoice>('invoices', existingInvoice.id, {
          amount: updatedAmount,
          details: updatedDetails
        });
      } else {
        const totalAmount = baseRent + serviceCharge + totalUtility;
        const invoiceDetails = `ভাড়া: ৳${baseRent}, সার্ভিস চার্জ: ৳${serviceCharge}, ইউটিলিটি: ৳${totalUtility} (${billDetails})`;

        MockDB.insert<Invoice>('invoices', {
          id: 'inv_' + Math.random().toString(36).substr(2, 9),
          companyId,
          unitId: selectedUnitId,
          tenantId: activeTenant.id,
          invoiceType: 'rent',
          amount: totalAmount,
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          billingMonth,
          status: 'pending',
          paidAmount: 0,
          details: invoiceDetails
        });
      }
    }

    setUtilities(MockDB.getTable<any>('utilities'));
    setInvoices(MockDB.getTable<Invoice>('invoices'));

    setSelectedUnitId('');
    setElecPrev('');
    setElecCurr('');
    setGasPrev('');
    setGasCurr('');
    setGarageBill('0');
    setWaterBill('500');
    setShowAddForm(false);

    alert('ইউটিলিটি বিল তৈরি সম্পন্ন হয়েছে এবং উক্ত ভাড়াটিয়ার ভাড়া চালানের সাথে যুক্ত হয়েছে!');
  };

  const handleDeleteBill = (bill: any) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই ইউটিলিটি বিলটি মুছে ফেলতে চান? এটি উক্ত ভাড়াটিয়ার মাসিক চালান থেকে বাদ দেওয়া হবে।')) return;

    MockDB.delete('utilities', bill.id);

    const linkedTenant = tenants.find(t => t.unitId === bill.unitId && t.status === 'active');
    if (linkedTenant) {
      const unitDetails = units.find(u => u.id === bill.unitId);
      const baseRent = unitDetails?.rentAmount || 0;
      const serviceCharge = unitDetails?.serviceCharge || 0;

      const existingInvoice = invoices.find(i => 
        i.tenantId === linkedTenant.id && 
        i.billingMonth === bill.billingMonth && 
        i.invoiceType === 'rent'
      );

      if (existingInvoice) {
        const newAmount = baseRent + serviceCharge;
        const newDetails = `ভাড়া: ৳${baseRent}, সার্ভিস চার্জ: ৳${serviceCharge} (ইউটিলিটি বিল বাতিল করা হয়েছে)`;

        MockDB.update<Invoice>('invoices', existingInvoice.id, {
          amount: newAmount,
          details: newDetails
        });
      }
    }

    setUtilities(MockDB.getTable<any>('utilities'));
    setInvoices(MockDB.getTable<Invoice>('invoices'));
    alert('ইউটিলিটি বিল মুছে ফেলা হয়েছে এবং ভাড়া চালানের মোট হিসাব আপডেট হয়েছে!');
  };

  // Filter utility logs based on global Fiscal Cycle Filter
  const filteredUtilities = filterRecordsByFiscalCycle(
    utilities,
    ut => ut.billingMonth,
    fiscalState,
    ut => {
      const unit = units.find(u => u.id === ut.unitId);
      return unit?.propertyId || ut.propertyId;
    }
  );

  const totalUtilityCost = filteredUtilities.reduce((sum, ut) => sum + (ut.calculatedBill || 0), 0);

  return (
    <div className="space-y-6 text-sm">
      
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('utilityMgmt')}</h2>
            <p className="text-xs text-slate-400">Manage, calculate, and add monthly & quarterly utilities directly to rent invoices</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          নতুন মিটার রিডিং ও ইউটিলিটি এন্ট্রি
        </button>
      </div>

      {/* Reusable Global Fiscal & Billing Cycle Filter */}
      <FiscalCycleFilter
        state={fiscalState}
        onChange={setFiscalState}
        properties={properties}
        showPropertySelector={true}
      />

      {/* Entry Form MODAL DIALOG with Light Theme Colors */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-3xl w-full space-y-5 my-8 relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500"></span>
                ইউটিলিটি ও মিটার রিডিং ইনপুট ফর্ম
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ফ্ল্যাট নির্বাচন *</label>
                  <select
                    value={selectedUnitId}
                    onChange={e => setSelectedUnitId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-sky-500 font-semibold"
                    required
                  >
                    <option value="">-- ফ্ল্যাট নির্বাচন করুন --</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.number} (ভাড়া: ৳{u.rentAmount.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">বিলিং সাইকেল / মাস *</label>
                  <input
                    type="text"
                    value={billingMonth}
                    onChange={e => setBillingMonth(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:border-sky-500 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Electricity Meter */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-extrabold text-xs text-sky-600 block">⚡ বিদ্যুৎ মিটার হিসাব (Electricity Meter)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">পূর্ববর্তী রিডিং</label>
                    <input
                      type="number"
                      placeholder="e.g. 12450"
                      value={elecPrev}
                      onChange={e => setElecPrev(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">বর্তমান রিডিং</label>
                    <input
                      type="number"
                      placeholder="e.g. 12790"
                      value={elecCurr}
                      onChange={e => setElecCurr(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">রেট/ইউনিট (টাকা)</label>
                    <input
                      type="number"
                      value={elecRate}
                      onChange={e => setElecRate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Gas Meter / Fixed */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-xs text-amber-600 block">🔥 গ্যাস বিল হিসাব (Gas Utility)</span>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="gasType"
                        checked={gasType === 'fixed'}
                        onChange={() => setGasType('fixed')}
                        className="accent-sky-600"
                      />
                      ফিক্সড রেট
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-slate-700">
                      <input
                        type="radio"
                        name="gasType"
                        checked={gasType === 'measured'}
                        onChange={() => setGasType('measured')}
                        className="accent-sky-600"
                      />
                      মিটার রিডিং
                    </label>
                  </div>
                </div>

                {gasType === 'fixed' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">মাসিক ফিক্সড গ্যাস বিল (টাকা)</label>
                    <input
                      type="number"
                      value={gasFixed}
                      onChange={e => setGasFixed(e.target.value)}
                      className="w-full sm:w-1/2 p-2 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">পূর্ববর্তী রিডিং</label>
                      <input
                        type="number"
                        value={gasPrev}
                        onChange={e => setGasPrev(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">বর্তমান রিডিং</label>
                      <input
                        type="number"
                        value={gasCurr}
                        onChange={e => setGasCurr(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">রেট/ইউনিট (টাকা)</label>
                      <input
                        type="number"
                        value={gasRate}
                        onChange={e => setGasRate(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Garage & Water */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">🚗 গ্যারেজ/পার্কিং বিল (টাকা)</label>
                  <input
                    type="number"
                    value={garageBill}
                    onChange={e => setGarageBill(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">💧 পানি সার্ভিস বিল (টাকা)</label>
                  <input
                    type="number"
                    value={waterBill}
                    onChange={e => setWaterBill(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-600/20 hover:shadow-xl transition-all cursor-pointer"
                >
                  বিল যোগ করুন & ইনভয়েস আপডেট
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Utility Records Table */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm">ইউটিলিটি ও বিলিং বিবরণী</span>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
            সাইকেলের মোট ইউটিলিটি: ৳ {totalUtilityCost.toLocaleString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">ফ্ল্যাট / ইউনিট</th>
                <th className="p-3">সাইকেল / মাস</th>
                <th className="p-3">বিদ্যুৎ বিল</th>
                <th className="p-3">গ্যাস বিল</th>
                <th className="p-3">পানি ও গ্যারেজ</th>
                <th className="p-3 text-right">মোট ইউটিলিটি</th>
                <th className="p-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUtilities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    নির্বাচিত সাইকেলে কোনো ইউটিলিটি বিলিং তথ্য নেই।
                  </td>
                </tr>
              ) : (
                filteredUtilities.map(ut => {
                  const unit = units.find(u => u.id === ut.unitId);
                  return (
                    <tr key={ut.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">{unit?.number || ut.unitId}</td>
                      <td className="p-3 font-semibold text-slate-600">{ut.billingMonth}</td>
                      <td className="p-3">৳ {ut.electricityBill || 0} ({ut.electricityCurr - ut.electricityPrev || 0} unit)</td>
                      <td className="p-3">৳ {ut.gasBill || 0}</td>
                      <td className="p-3">৳ {(ut.waterBill || 0) + (ut.garageBill || 0)}</td>
                      <td className="p-3 text-right font-extrabold text-sky-500">৳ {ut.calculatedBill?.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteBill(ut)}
                          className="p-1 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title="Delete utility bill"
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
