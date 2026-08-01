import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Check, Settings, LogOut } from 'lucide-react';

interface UserProfileDropdownProps {
  activeRole: string;
  onRoleChange: (role: string) => void;
}

export const ROLE_LABELS: Record<string, string> = {
  owner: 'Property Owner',
  manager: 'Property Manager',
  accountant: 'Accountant',
  collector: 'Cash Collector',
  tenant: 'Tenant',
  superAdmin: 'Super Admin',
};

export const ROLE_USERS: Record<string, { name: string; avatar: string }> = {
  owner: {
    name: 'Mr. Mohiuddin',
    avatar: ''
  },
  manager: {
    name: 'Md. Bayzid',
    avatar: ''
  },
  accountant: {
    name: 'Sultana Razia',
    avatar: ''
  },
  collector: {
    name: 'Md. Al-Amin',
    avatar: ''
  },
  tenant: {
    name: 'Shahriar Rahman',
    avatar: ''
  },
  superAdmin: {
    name: 'System Admin',
    avatar: ''
  }
};

export default function UserProfileDropdown({ activeRole, onRoleChange }: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentUser = ROLE_USERS[activeRole] || ROLE_USERS.owner;
  const currentRoleLabel = ROLE_LABELS[activeRole] || 'User';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl hover:bg-slate-100 transition-all border border-slate-200/80 text-left bg-white/70 shadow-sm"
      >
        {/* Profile Placeholder Avatar Icon */}
        <div className="relative shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold ring-2 ring-sky-500/30">
          <User className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
        </div>

        {/* User Name & Role (Responsive display) */}
        <div className="hidden sm:flex flex-col min-w-0">
          <span className="text-xs font-bold text-slate-800 truncate leading-tight">
            {currentUser.name}
          </span>
          <span className="text-[10px] font-semibold text-sky-600 truncate">
            {currentRoleLabel}
          </span>
        </div>

        {/* Mobile View: Compact Role Label */}
        <div className="flex sm:hidden flex-col">
          <span className="text-[10px] font-bold text-sky-600 truncate max-w-[70px]">
            {currentRoleLabel.split(' ')[0]}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Profile Popup Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 sm:w-80 glass-panel bg-white/95 border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-200">
          {/* User Info Header Card */}
          <div className="p-4 bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border-b border-slate-100 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0 ring-2 ring-sky-500/40">
              <User className="w-6 h-6 text-sky-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-extrabold text-sm text-slate-800 truncate">
                {currentUser.name}
              </h4>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500 text-white mt-1">
                {currentRoleLabel}
              </span>
            </div>
          </div>

          {/* Role Switcher Section */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
              Switch Access Role
            </span>
            <div className="space-y-1">
              {Object.keys(ROLE_LABELS).map((roleKey) => {
                const isActive = activeRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    onClick={() => {
                      onRoleChange(roleKey);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-500 text-white font-bold shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-semibold">{ROLE_LABELS[roleKey]}</span>
                    {isActive && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Footer Action Links */}
          <div className="p-2 bg-slate-50/80 flex justify-between items-center text-[10px] text-slate-500">
            <button className="flex items-center gap-1 hover:text-sky-500 p-1 cursor-pointer">
              <Settings className="w-3 h-3" /> Account Settings
            </button>
            <button className="flex items-center gap-1 hover:text-rose-500 p-1 font-semibold cursor-pointer">
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
