import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppNotification, NotificationStatus, NotificationCategory } from '../types';

interface NotificationContextProps {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'status'> & { id?: string }) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  completeNotification: (id: string) => void;
  clearAll: () => void;
  isCenterOpen: boolean;
  setIsCenterOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

const STORAGE_KEY = 'rideprofit_notifications';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isCenterOpen, setIsCenterOpen] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppNotification[];
        
        // Auto Cleanup Logic
        const now = new Date().getTime();
        const valid = parsed.filter(n => {
          const age = now - new Date(n.timestamp).getTime();
          const daysAge = age / (1000 * 60 * 60 * 24);
          
          if (n.category === 'System' && daysAge > 30) return false;
          if (n.status === 'completed' && daysAge > 1) return false; // Clean completed quickly
          if (n.title.toLowerCase().includes('backup') && daysAge > 7) return false;
          
          return true;
        });
        
        setNotifications(valid);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'status'> & { id?: string }) => {
    setNotifications(prev => {
      // Duplicate check based on referenceId or exact title+description match
      const duplicateIndex = prev.findIndex(n => 
        (notif.referenceId && n.referenceId === notif.referenceId) || 
        (n.title === notif.title && n.description === notif.description)
      );

      if (duplicateIndex >= 0) {
        // Update timestamp and status of existing
        const updated = [...prev];
        updated[duplicateIndex] = {
          ...updated[duplicateIndex],
          timestamp: new Date().toISOString(),
          status: 'unread',
          priority: notif.priority // upgrade priority if it changed
        };
        return updated;
      }

      // Add new
      const newNotif: AppNotification = {
        ...notif,
        id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toISOString(),
        status: 'unread'
      };
      
      return [newNotif, ...prev];
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, status: n.status === 'unread' ? 'read' : n.status })));
  }, []);

  const completeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'completed' } : n));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      completeNotification,
      clearAll,
      isCenterOpen,
      setIsCenterOpen
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
