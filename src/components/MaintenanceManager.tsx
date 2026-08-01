import React, { useState } from 'react';
import { useTranslation } from '../services/translation';
import { MockDB, MaintenanceRequest, Unit, AccountTransaction, Property } from '../services/db';
import { FiscalCycleState, DEFAULT_FISCAL_CYCLE } from '../services/fiscalCycle';
import { filterRecordsByFiscalCycle } from '../services/mongoQueryHelper';
import FiscalCycleFilter from './FiscalCycleFilter';
import { Wrench, Plus, CheckCircle, RefreshCw, DollarSign } from 'lucide-react';

export default function MaintenanceManager({ companyId }: { companyId: string }) {
  const { t, lang } = useTranslation();

  // DB tables
  const [requests, setRequests] = useState<MaintenanceRequest[]>(() => MockDB.getTable<MaintenanceRequest>('maintenance'));
  const [units] = useState<Unit[]>(() => MockDB.getTable<Unit>('units'));
  const [properties] = useState<Property[]>(() => MockDB.getTable<Property>('properties').filter(p => p.companyId === companyId));

  // Global Fiscal & Billing Cycle Filter State
  const [fiscalState, setFiscalState] = useState<FiscalCycleState>(DEFAULT_FISCAL_CYCLE);

  // Edit / Assign States
  const [activeRequest, setActiveRequest] = useState<MaintenanceRequest | null>(null);
  const [techName, setTechName] = useState('');
  const [matCost, setMatCost] = useState('');
  const [labCost, setLabCost] = useState('');
  const [status, setStatus] = useState<'pending' | 'assigned' | 'in_progress' | 'resolved'>('pending');

  const openAssignModal = (req: MaintenanceRequest) => {
    setActiveRequest(req);
    setTechName(req.technicianName || '');
    setMatCost(req.materialCost.toString());
    setLabCost(req.laborCost.toString());
    setStatus(req.status);
  };

  const handleUpdateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    const materials = Number(matCost) || 0;
    const labor = Number(labCost) || 0;

    // Update maintenance request
    MockDB.update<MaintenanceRequest>('maintenance', activeRequest.id, {
      status,
      technicianName: techName,
      materialCost: materials,
      laborCost: labor
    });

    // If resolved, create accounting expense automatically!
    if (status === 'resolved' && (materials + labor) > 0) {
      MockDB.insert<AccountTransaction>('transactions', {
        id: 'tx_' + Math.random().toString(36).substr(2, 9),
        companyId,
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category: 'Maintenance Cost',
        account: 'Cashbook',
        amount: materials + labor,
        description: `রক্ষণাবেক্ষণ ব্যয়: ${activeRequest.title} (${activeRequest.id})`
      });
    }

    setRequests(MockDB.getTable<MaintenanceRequest>('maintenance'));
    setActiveRequest(null);
    alert('Ticket updated successfully!');
  };

  // Filter requests by Fiscal Cycle State
  const filteredRequests = filterRecordsByFiscalCycle(
    requests,
    r => r.createdAt,
    fiscalState,
    r => r.propertyId
  );

  const totalMaintenanceCost = filteredRequests.reduce((sum, r) => sum + r.materialCost + r.laborCost, 0);

  return (
    <div className="space-y-6 text-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('maintenanceMgmt')}</h2>
            <p className="text-xs text-slate-400">Track tenant complaints, assign electricians/plumbers and log maintenance costs by monthly & quarterly cycles</p>
          </div>
        </div>
      </div>

      {/* Global Fiscal Cycle Filter Component */}
      <FiscalCycleFilter
        state={fiscalState}
        onChange={setFiscalState}
        properties={properties}
        showPropertySelector={true}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">সাইকেলে মোট টিকিট</span>
            <span className="text-xl font-black text-slate-800">{filteredRequests.length} টি</span>
          </div>
          <Wrench className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">সম্পন্ন কাজ (Resolved)</span>
            <span className="text-xl font-black text-emerald-500">
              {filteredRequests.filter(r => r.status === 'resolved').length} টি
            </span>
          </div>
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block uppercase">সাইকেলের রক্ষণাবেক্ষণ ব্যয়</span>
            <span className="text-xl font-black text-rose-500">৳ {totalMaintenanceCost.toLocaleString()}</span>
          </div>
          <DollarSign className="w-5 h-5 text-rose-500" />
        </div>
      </div>

      {/* Tickets List */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200">
        <span className="font-bold text-sm block mb-4">Facility Tickets & Complaints Logs</span>
        
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              নির্বাচিত সাইকেলে কোনো মেরামত/রক্ষণাবেক্ষণ টিকিট পাওয়া যায়নি।
            </div>
          ) : (
            filteredRequests.map((req) => {
              const unitName = units.find(u => u.id === req.unitId)?.number || 'Common Area';
              return (
                <div key={req.id} className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{req.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        req.priority === 'high' ? 'bg-rose-500/10 text-rose-500' :
                        req.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'
                      }`}>
                        {req.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600">{req.description}</p>
                    <div className="flex gap-3 text-[10px] text-slate-600 pt-1">
                      <span>Target: <strong className="text-slate-800">{unitName}</strong></span>
                      <span>Created: {req.createdAt}</span>
                      {req.technicianName && <span>Staff: <strong className="text-sky-400">{req.technicianName}</strong></span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        req.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400' :
                        req.status === 'in_progress' ? 'bg-sky-500/10 text-sky-400' :
                        req.status === 'assigned' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                      {(req.materialCost + req.laborCost) > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1">Cost: ৳{(req.materialCost + req.laborCost).toLocaleString()}</p>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => openAssignModal(req)}
                      className="px-3 py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 text-[10px] font-bold rounded-lg cursor-pointer"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ticket Assignment Modal Overlay */}
      {activeRequest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl glass-panel border border-slate-200 animate-slide-in">
            <form onSubmit={handleUpdateTicket} className="p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-800">Manage Ticket: {activeRequest.title}</h3>
              
              <div>
                <label className="text-xs text-slate-500 block mb-1">Status / কাজের অবস্থা</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                >
                  <option value="pending">Pending (অপেক্ষমান)</option>
                  <option value="assigned">Assigned (কর্মী নিয়োজিত)</option>
                  <option value="in_progress">In Progress (চলমান কাজ)</option>
                  <option value="resolved">Resolved (সম্পন্ন হয়েছে)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Assign Technician Name</label>
                <input 
                  type="text" 
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                  placeholder="e.g. রহমান প্লাম্বার"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Material Cost (৳)</label>
                  <input 
                    type="number" 
                    value={matCost}
                    onChange={(e) => setMatCost(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Labor / Service Cost (৳)</label>
                  <input 
                    type="number" 
                    value={labCost}
                    onChange={(e) => setLabCost(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button 
                  type="button"
                  onClick={() => setActiveRequest(null)}
                  className="w-1/2 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="w-1/2 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  Confirm Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
