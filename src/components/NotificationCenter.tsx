import React, { useMemo, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { AppNotification, NotificationCategory } from '../types';
import { 
  X, Bell, CheckCircle2, Trash2, Wrench, TrendingUp, Car, 
  Settings, AlertTriangle, Info, Clock, Check
} from 'lucide-react';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';

// Helper for relative time
function getRelativeTime(isoStr: string) {
  const d = new Date(isoStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString();
}

function getGroupKey(isoStr: string) {
  const d = new Date(isoStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  
  const target = d.getTime();
  if (target >= today) return 'Today';
  if (target >= yesterday) return 'Yesterday';
  return 'Earlier';
}

interface NotificationCenterProps {
  onCompleteMaintenance?: (referenceId: string) => void;
}

export default function NotificationCenter({ onCompleteMaintenance }: NotificationCenterProps) {
  const { 
    notifications, 
    isCenterOpen, 
    setIsCenterOpen, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    completeNotification,
    clearAll 
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'All' | 'Unread' | NotificationCategory>('All');

  const triggerClick = () => {
    feedbackAudio.playClickSound();
    triggerHapticFeedback(40);
  };

  const handleComplete = (n: AppNotification) => {
    triggerClick();
    completeNotification(n.id);
    if (n.category === 'Maintenance' && n.referenceId && onCompleteMaintenance) {
      onCompleteMaintenance(n.referenceId);
    }
  };

  const filtered = useMemo(() => {
    let res = notifications;
    if (activeFilter === 'Unread') res = res.filter(n => n.status === 'unread');
    else if (activeFilter !== 'All') res = res.filter(n => n.category === activeFilter);
    
    // Sort logic: critical first, then newest
    res = [...res].sort((a, b) => {
      if (a.priority === 'critical' && b.priority !== 'critical') return -1;
      if (b.priority === 'critical' && a.priority !== 'critical') return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return res;
  }, [notifications, activeFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, AppNotification[]> = {
      'Today': [],
      'Yesterday': [],
      'Earlier': []
    };
    filtered.forEach(n => {
      map[getGroupKey(n.timestamp)].push(n);
    });
    return map;
  }, [filtered]);

  if (!isCenterOpen) return null;

  const filters = ['All', 'Unread', 'Maintenance', 'Profit', 'System'];

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={() => { triggerClick(); setIsCenterOpen(false); }}
      />

      {/* Sliding Panel */}
      <div 
        className="fixed inset-x-0 bottom-0 top-16 md:top-0 md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-zinc-950 border-t md:border-t-0 md:border-l border-zinc-900 z-[101] flex flex-col shadow-2xl transition-transform transform translate-y-0 md:translate-x-0 rounded-t-3xl md:rounded-none"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black/40">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-white" />
            <h2 className="text-base font-black text-white uppercase tracking-wide">Notifications</h2>
          </div>
          <button 
            onClick={() => { triggerClick(); setIsCenterOpen(false); }}
            className="p-1.5 text-zinc-500 hover:text-white bg-zinc-900 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="p-3 border-b border-zinc-900 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => { triggerClick(); setActiveFilter(f as any); }}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-colors ${
                activeFilter === f ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
              <Bell className="w-12 h-12 text-zinc-600" />
              <div>
                <h3 className="text-sm font-black text-zinc-400 uppercase">No notifications yet</h3>
                <p className="text-[10px] text-zinc-500 max-w-[200px] mt-1 font-bold">RideProfit will notify you about maintenance, profits and important updates.</p>
              </div>
            </div>
          ) : (
            ['Today', 'Yesterday', 'Earlier'].map(groupKey => {
              const items = grouped[groupKey];
              if (items.length === 0) return null;
              
              return (
                <div key={groupKey} className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-wider sticky top-0 bg-zinc-950/90 backdrop-blur py-1 z-10">
                    {groupKey}
                  </h3>
                  {items.map(n => (
                    <NotificationCard 
                      key={n.id} 
                      n={n} 
                      onRead={() => { triggerClick(); markAsRead(n.id); }}
                      onDelete={() => { triggerClick(); deleteNotification(n.id); }}
                      onComplete={() => handleComplete(n)}
                    />
                  ))}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-zinc-900 bg-black/40 flex justify-between gap-3 shrink-0">
            <button 
              onClick={() => { triggerClick(); markAllAsRead(); }}
              className="flex-1 py-2.5 bg-zinc-900 text-zinc-300 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-zinc-800 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" /> Mark all read
            </button>
            <button 
              onClick={() => { triggerClick(); clearAll(); setIsCenterOpen(false); }}
              className="flex-1 py-2.5 bg-red-500/10 text-red-400 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function NotificationCard({ n, onRead, onDelete, onComplete }: { 
  n: AppNotification; 
  onRead: () => void;
  onDelete: () => void;
  onComplete: () => void;
}) {
  const isUnread = n.status === 'unread';
  const isCompleted = n.status === 'completed';

  // Styling by priority
  let colorClass = 'text-zinc-400 border-zinc-800 bg-zinc-900/40';
  let icon = <Info className="w-4 h-4" />;
  
  if (n.priority === 'critical') {
    colorClass = 'text-red-400 border-red-500/30 bg-red-500/10';
    icon = <AlertTriangle className="w-4 h-4" />;
  } else if (n.priority === 'warning') {
    colorClass = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    icon = <AlertTriangle className="w-4 h-4" />;
  } else if (n.priority === 'success') {
    colorClass = 'text-green-400 border-green-500/30 bg-green-500/10';
    icon = <CheckCircle2 className="w-4 h-4" />;
  }

  // Category specific icons override priority icon if we want
  if (n.category === 'Maintenance') icon = <Wrench className="w-4 h-4" />;
  if (n.category === 'Profit') icon = <TrendingUp className="w-4 h-4" />;
  if (n.category === 'System') icon = <Settings className="w-4 h-4" />;
  if (n.category === 'Vehicle') icon = <Car className="w-4 h-4" />;

  return (
    <div className={`relative p-3 rounded-xl border transition-all ${
      isUnread ? 'bg-zinc-900 border-zinc-700 shadow-md' : 'bg-black border-zinc-900 opacity-80'
    } ${isCompleted ? 'opacity-50 grayscale' : ''}`}>
      
      {isUnread && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border border-black animate-pulse"></span>
      )}

      <div className="flex gap-3 items-start">
        <div className={`p-2 rounded-lg border ${colorClass} shrink-0`}>
          {icon}
        </div>
        
        <div className="flex-1 pt-0.5">
          <div className="flex justify-between items-start gap-2">
            <h4 className={`text-xs font-black uppercase ${isUnread ? 'text-white' : 'text-zinc-300'} ${isCompleted ? 'line-through' : ''}`}>
              {n.title}
            </h4>
            <span className="text-[9px] font-bold text-zinc-500 whitespace-nowrap">{getRelativeTime(n.timestamp)}</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 font-medium leading-relaxed">
            {n.description}
          </p>
          
          <div className="flex flex-wrap gap-2 mt-3">
            {n.category === 'Maintenance' && !isCompleted && (
              <button onClick={onComplete} className="px-2 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[9px] font-black uppercase flex items-center gap-1 hover:bg-green-500/30 transition-colors">
                <Check className="w-3 h-3" /> Completed
              </button>
            )}
            
            {isUnread && (
              <button onClick={onRead} className="px-2 py-1.5 bg-zinc-800 text-zinc-300 rounded text-[9px] font-black uppercase hover:bg-zinc-700 transition-colors">
                Mark Read
              </button>
            )}
            <button onClick={onDelete} className="px-2 py-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded text-[9px] font-black uppercase transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
