import { useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { VehicleConfig, Ride } from '../types';
import { getMaintenanceStatus, getEstimatedOdometer } from '../utils/maintenance';

export function useSmartNotifications(vehicle: VehicleConfig, rides: Ride[]) {
  const { addNotification } = useNotifications();
  const settings = vehicle.notificationSettings;

  // Evaluate Maintenance Reminders
  useEffect(() => {
    if (settings?.maintenance === false) return;
    
    const estimated = getEstimatedOdometer(vehicle, rides);
    const statuses = getMaintenanceStatus(vehicle, estimated);
    
    statuses.forEach(({ record, status, remainingKm }) => {
      if (status === 'Overdue') {
        addNotification({
          category: 'Maintenance',
          priority: 'critical',
          title: `${record.label} Overdue`,
          description: `Service is overdue by ${Math.abs(remainingKm).toFixed(0)} KM. Please complete this soon.`,
          referenceId: record.id
        });
      } else if (status === 'Due Soon') {
        addNotification({
          category: 'Maintenance',
          priority: 'warning',
          title: `${record.label} Due Soon`,
          description: `Service is due in ${remainingKm.toFixed(0)} KM.`,
          referenceId: record.id
        });
      }
    });
  }, [vehicle, rides, addNotification, settings?.maintenance]);

  // Evaluate Ride & Profit Goals
  useEffect(() => {
    if (rides.length === 0) return;
    
    // Check Today's Profit
    if (settings?.profitAlerts !== false) {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayRides = rides.filter(r => new Date(r.startTime).getTime() >= startOfToday);
      
      const todayProfit = todayRides.reduce((acc, r) => acc + r.profit, 0);
      
      if (todayProfit > 1000) { // arbitrary threshold for demo
        addNotification({
          category: 'Profit',
          priority: 'success',
          title: 'High Profit Day',
          description: `Great job! Your profit today crossed 1000. Keep up the good work.`,
          referenceId: `profit_${startOfToday}`
        });
      }
    }
  }, [rides, addNotification, settings?.profitAlerts]);

  // Evaluate System (Simulate on boot)
  useEffect(() => {
    if (settings?.systemUpdates !== false) {
      addNotification({
        category: 'System',
        priority: 'info',
        title: 'App Updated',
        description: 'RideProfit has been successfully updated with the new Intelligent Notification Center.',
        referenceId: 'sys_update_v2'
      });
    }
  }, [addNotification, settings?.systemUpdates]);
}
