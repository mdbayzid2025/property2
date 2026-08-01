import React, { useState, useRef, UIEvent } from 'react';
import { Bell, CheckCheck, Clock, AlertTriangle, FileText, Wrench, Zap, UserCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'rent' | 'maintenance' | 'utility' | 'tenant' | 'system';
  priority: 'high' | 'medium' | 'normal';
  read: boolean;
}

// Generate 50 realistic mock notifications
const generate50Notifications = (): NotificationItem[] => {
  const categories: NotificationItem['category'][] = ['rent', 'maintenance', 'utility', 'tenant', 'system'];
  const priorities: NotificationItem['priority'][] = ['high', 'medium', 'normal'];

  const templates = [
    { title: 'Rent Payment Received', desc: 'Flat A-402 paid 25,000 BDT via Bkash.', cat: 'rent' },
    { title: 'Rent Overdue Alert', desc: 'Flat B-102 July rent is 5 days overdue.', cat: 'rent', prio: 'high' },
    { title: 'Maintenance Request Created', desc: 'Water leak reported in Flat C-301 kitchen.', cat: 'maintenance', prio: 'high' },
    { title: 'Elevator Servicing Completed', desc: 'Monthly lift maintenance completed for Tower 1.', cat: 'maintenance' },
    { title: 'DESCO Electricity Bill Added', desc: 'July meter readings uploaded for Commercial Block A.', cat: 'utility' },
    { title: 'WASA Meter Reading Pending', desc: 'Water meter reading needed for 3rd floor units.', cat: 'utility' },
    { title: 'New Tenant Registered', desc: 'Kamrul Hasan registered for Flat A-201.', cat: 'tenant' },
    { title: 'Tenant Lease Expiring Soon', desc: 'Lease agreement for Shop 102 expires in 15 days.', cat: 'tenant', prio: 'medium' },
    { title: 'System Security Audit', desc: 'Weekly backup completed successfully at 02:00 AM.', cat: 'system' },
    { title: 'Advance Deposit Received', desc: '50,000 BDT security deposit received for Flat B-404.', cat: 'rent' },
    { title: 'AC Repair Ticket Closed', desc: 'Technician resolved AC cooling issue in Office 305.', cat: 'maintenance' },
    { title: 'Gas Bill Payment Confirmation', desc: 'Titas Gas bill payment recorded for 12 units.', cat: 'utility' },
    { title: 'Tenant NID Verified', desc: 'Verification complete for new tenant Rafiqul Islam.', cat: 'tenant' },
    { title: 'Database Optimization', desc: 'System speed auto-optimized by Super Admin server.', cat: 'system' },
    { title: 'Parking Spot Allocation', desc: 'Spot P-12 allocated to Flat C-104.', cat: 'tenant' },
    { title: 'Security Gate Alert', desc: 'Night shift visitor log summary generated.', cat: 'system' },
    { title: 'Generator Diesel Low', desc: 'Backup generator fuel level below 20%.', cat: 'maintenance', prio: 'high' },
    { title: 'Partial Rent Payment', desc: 'Flat A-101 paid 10,000 BDT partial rent.', cat: 'rent', prio: 'medium' },
    { title: 'Fire Safety Inspection Passed', desc: 'Quarterly fire extinguisher audit verified.', cat: 'system' },
    { title: 'CCTV Camera Offline', desc: 'Camera 04 (Basement Parking) disconnected.', cat: 'maintenance', prio: 'high' },
  ];

  const notifications: NotificationItem[] = [];
  for (let i = 1; i <= 50; i++) {
    const template = templates[(i - 1) % templates.length];
    const cat = (template.cat as NotificationItem['category']) || categories[i % categories.length];
    const prio = (template.prio as NotificationItem['priority']) || priorities[i % priorities.length];
    
    // Time generator
    let timeStr = `${i * 12} mins ago`;
    if (i > 10) timeStr = `${Math.floor(i / 2)} hours ago`;
    if (i > 30) timeStr = `${Math.floor(i / 20)} days ago`;

    notifications.push({
      id: `notif-${i}`,
      title: `${template.title} #${i}`,
      description: template.desc,
      timestamp: timeStr,
      category: cat,
      priority: prio,
      read: i > 12 // first 12 unread, remaining read
    });
  }

  return notifications;
};

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(generate50Notifications());
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [page, setPage] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 10;

  // Filtered dataset
  const filteredNotifications = notifications.filter(item => {
    if (filter === 'unread') return !item.read;
    if (filter === 'urgent') return item.priority === 'high';
    return true;
  });

  const totalFilteredCount = filteredNotifications.length;
  const visibleCount = page * ITEMS_PER_PAGE;
  const visibleNotifications = filteredNotifications.slice(0, visibleCount);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Infinite Scroll Handler
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 30) {
      if (visibleCount < totalFilteredCount && !loadingMore) {
        setLoadingMore(true);
        setTimeout(() => {
          setPage(prev => prev + 1);
          setLoadingMore(false);
        }, 350);
      }
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const toggleReadStatus = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const getCategoryIcon = (category: NotificationItem['category']) => {
    switch (category) {
      case 'rent':
        return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-amber-500" />;
      case 'utility':
        return <Zap className="w-4 h-4 text-sky-500" />;
      case 'tenant':
        return <UserCheck className="w-4 h-4 text-indigo-500" />;
      case 'system':
      default:
        return <ShieldAlert className="w-4 h-4 text-purple-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] glass-panel bg-white/95 border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-sky-500" />
          <h3 className="font-bold text-slate-800">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-[11px] text-sky-600 font-semibold hover:underline flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-100 flex gap-2">
        <button
          onClick={() => { setFilter('all'); setPage(1); }}
          className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            filter === 'all'
              ? 'bg-sky-500 text-white shadow-sm font-bold'
              : 'text-slate-600  hover:bg-slate-200/60 '
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => { setFilter('unread'); setPage(1); }}
          className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            filter === 'unread'
              ? 'bg-sky-500 text-white shadow-sm font-bold'
              : 'text-slate-600  hover:bg-slate-200/60 '
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => { setFilter('urgent'); setPage(1); }}
          className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
            filter === 'urgent'
              ? 'bg-rose-500 text-white shadow-sm font-bold'
              : 'text-slate-600  hover:bg-slate-200/60 '
          }`}
        >
          Urgent
        </button>
      </div>

      {/* Notifications Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar"
      >
        {visibleNotifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No notifications found</p>
          </div>
        ) : (
          visibleNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleReadStatus(item.id)}
              className={`p-3.5 transition-all hover:bg-slate-50  cursor-pointer flex gap-3 ${
                !item.read ? 'bg-sky-50/50 ' : ''
              }`}
            >
              <div className="mt-0.5 p-2 rounded-xl bg-slate-100 shrink-0">
                {getCategoryIcon(item.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className={`font-bold truncate ${!item.read ? 'text-slate-900 ' : 'text-slate-700 '}`}>
                    {item.title}
                  </span>
                  {item.priority === 'high' && (
                    <span className="shrink-0 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertTriangle className="w-2.5 h-2.5" /> High
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.timestamp}
                  </span>
                  {!item.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 ml-auto"></span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Scroll Pagination Status Footer */}
        <div className="p-3 text-center text-[11px] text-slate-500 bg-slate-50/50 border-t border-slate-100">
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2 text-sky-500 font-semibold">
              <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
              Loading more notifications...
            </div>
          ) : visibleCount < totalFilteredCount ? (
            <span className="text-slate-400">
              Showing {visibleCount} of {totalFilteredCount} notifications • Scroll for more
            </span>
          ) : (
            <span className="text-slate-400 font-medium">All {totalFilteredCount} notifications loaded</span>
          )}
        </div>
      </div>
    </div>
  );
}
