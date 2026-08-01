import React, { useState, useEffect } from 'react';
import { useTranslation, Language } from './services/translation';
import { MockDB, Company } from './services/db';

// Component imports
// VisitorParking, SalesBooking, and AISmartFeatures have been removed
import Dashboard from './components/Dashboard';
import PropertyManager from './components/PropertyManager';
import TenantManager from './components/TenantManager';
import RentManager from './components/RentManager';
import UtilityManager from './components/UtilityManager';
import MaintenanceManager from './components/MaintenanceManager';
import Accounting from './components/Accounting';
import EmployeeManager from './components/EmployeeManager';
import Reports from './components/Reports';
import SuperAdmin from './components/SuperAdmin';
import TenantPortal from './components/TenantPortal';
import AIChatSidebar from './components/AIChatSidebar';
import NotificationDropdown from './components/NotificationDropdown';
import UserProfileDropdown from './components/UserProfileDropdown';

// Icons
import { Menu, X, Globe, Bell, Bot, ChevronRight, Home, Users, FileText, Zap, Wrench, ShieldCheck, BadgeDollarSign, BookOpen, Briefcase, FileSpreadsheet, Brain, Shield, User } from 'lucide-react';

export default function App() {
  const { t, lang, toggleLanguage } = useTranslation();

  // App States
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeRole, setActiveRole] = useState<string>('owner'); // owner, admin, manager, accountant, collector, tenant
  const [activeCompanyId, setActiveCompanyId] = useState<string>('c1');
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // Load Companies
  const companies = MockDB.getTable<Company>('companies');
  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

  

  // Handle auto-routing when switching roles
  useEffect(() => {
    if (activeRole === 'tenant') {
      setActiveTab('tenantPortal');
    } else if (activeRole === 'superAdmin') {
      setActiveTab('superAdmin');
    } else {
      setActiveTab('dashboard');
    }
  }, [activeRole]);

  // Role Access configuration
  const getSidebarMenus = () => {
    if (activeRole === 'tenant') {
      return [{ id: 'tenantPortal', label: t('tenantPortal'), icon: User }];
    }
    if (activeRole === 'superAdmin') {
      return [
        { id: 'superAdmin', label: t('superAdmin'), icon: Shield },
        { id: 'reports', label: t('reports'), icon: FileSpreadsheet }
      ];
    }

    const items = [
      { id: 'dashboard', label: t('dashboard'), icon: Home },
      { id: 'reports', label: t('reports'), icon: FileSpreadsheet },
      { id: 'accountingSystem', label: t('accountingSystem'), icon: BookOpen },
      { id: 'rentMgmt', label: t('rentMgmt'), icon: FileText },
      { id: 'propertyMgmt', label: t('propertyMgmt'), icon: Home },
      { id: 'employeeMgmt', label: t('employeeMgmt'), icon: Briefcase },
      { id: 'tenantMgmt', label: t('tenantMgmt'), icon: Users },
      { id: 'utilityMgmt', label: t('utilityMgmt'), icon: Zap },
      { id: 'maintenanceMgmt', label: t('maintenanceMgmt'), icon: Wrench },
    ];

    // Filter menus based on role
    if (activeRole === 'accountant') {
      return items.filter(i => ['dashboard', 'rentMgmt', 'accountingSystem', 'reports'].includes(i.id));
    }
    if (activeRole === 'collector') {
      return items.filter(i => ['dashboard', 'rentMgmt', 'utilityMgmt'].includes(i.id));
    }
    return items;
  };

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard companyId={activeCompanyId} />;
      case 'propertyMgmt':
      case 'unitMgmt':
        return <PropertyManager companyId={activeCompanyId} />;
      case 'tenantMgmt':
        return <TenantManager companyId={activeCompanyId} />;
      case 'rentMgmt':
        return <RentManager companyId={activeCompanyId} />;
      case 'utilityMgmt':
        return <UtilityManager companyId={activeCompanyId} />;
      case 'maintenanceMgmt':
        return <MaintenanceManager companyId={activeCompanyId} />;
      case 'accountingSystem':
        return <Accounting companyId={activeCompanyId} />;
      case 'employeeMgmt':
        return <EmployeeManager companyId={activeCompanyId} />;
      case 'reports':
        return <Reports companyId={activeCompanyId} />;
      case 'superAdmin':
        return <SuperAdmin />;
      case 'tenantPortal':
        return <TenantPortal tenantId="t1" />; // KAMRUL HASAN default tenant profile demo
      default:
        return <Dashboard companyId={activeCompanyId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-mesh flex text-slate-800 selection:bg-sky-500/30 selection:text-sky-300">

      {/* Sidebar Panel */}
      <aside className={`no-print fixed inset-y-0 left-0 z-40 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'
        } glass-panel border-r border-slate-200  bg-sidebar-bg flex flex-col justify-between hidden md:flex`}>
        <div className="flex flex-col h-full overflow-hidden w-full">
          {/* Logo & Slogan */}
          <div className="p-6 border-b border-slate-200 flex justify-between items-center shrink-0">
            {!sidebarCollapsed ? (
              <div>
                <h1 className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent uppercase m-0 leading-none">
                  {t('appName')}
                </h1>
                <p className="text-[9px] text-slate-500 font-semibold mt-1 uppercase tracking-widest">{t('slogan')}</p>
              </div>
            ) : (
              <span className="text-lg font-black text-sky-400 mx-auto">BP</span>
            )}
          </div>

          {/* Menus List - Scrollable */}
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            {getSidebarMenus().map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center p-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/15'
                    : 'text-slate-500  hover:bg-slate-100  hover:text-slate-800 '
                    }`}
                >
                  <IconComponent className="w-5 h-5 mr-3 shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Brand Copyright Info */}
          {!sidebarCollapsed && (
            <div className="p-6 border-t border-slate-200 text-[10px] text-slate-500 font-medium shrink-0">
              <p>{t('footerMadeBy')}</p>
              <p className="mt-1">
                <a href="https://www.softwarepointbd.com/" target="_blank" rel="noopener noreferrer" className="hover:underline text-sky-400">
                  www.softwarepointbd.com
                </a>
              </p>
              <p className="mt-1">{t('hotline')}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        } pb-16 md:pb-0`}>

        {/* Sticky Header Navbar */}
        <header className="no-print sticky top-0 z-30 glass-panel border-b border-slate-200 bg-sidebar-bg flex items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 flex items-center gap-1.5 transition-all border border-transparent hover:border-slate-200"
              title="Change Language"
            >
              <Globe className="w-4 h-4 text-purple-500" />
              <span className="text-[11px] font-bold uppercase">{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition-all relative border border-transparent hover:border-slate-200"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              </button>
              <NotificationDropdown
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            {/* Profile photo with Name and Role */}
            <UserProfileDropdown
              activeRole={activeRole}
              onRoleChange={(role) => setActiveRole(role)}
            />
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-6 w-full pb-24 md:pb-8">
          {renderActiveModule()}
        </main>

        {/* Mobile Responsive Bottom Navigation */}
        <nav className="no-print fixed bottom-0 left-0 right-0 h-16 glass-panel border-t border-slate-200 bg-sidebar-bg flex items-center justify-around z-40 md:hidden">
          {getSidebarMenus().slice(0, 4).map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center p-2 text-slate-500  hover:text-slate-800  transition-all ${isActive ? 'text-sky-600  font-bold' : ''
                  }`}
              >
                <IconComponent className="w-5 h-5" />
                <span className="text-[9px] mt-1">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>

        {/* AI Assistant Chat Widget */}
        <AIChatSidebar isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
}
