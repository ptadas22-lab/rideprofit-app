import { VehicleConfig, Ride, MaintenanceRecord } from '../types';

export type MaintenanceStatus = 'Good' | 'Due Soon' | 'Overdue';

export interface MaintenanceStatusResult {
  record: MaintenanceRecord;
  status: MaintenanceStatus;
  remainingKm: number;
}

export function getTotalDistanceTracked(rides: Ride[]): number {
  return rides.reduce((acc, r) => acc + (r.distanceKm || 0) + (r.deadKm || 0), 0);
}

export function getEstimatedOdometer(vehicle: VehicleConfig, rides: Ride[]): number {
  const base = vehicle.baseOdometer || 0;
  return base + getTotalDistanceTracked(rides);
}

export function getMaintenanceStatus(vehicle: VehicleConfig, estimatedOdometer: number): MaintenanceStatusResult[] {
  if (!vehicle.maintenanceRecords) return [];

  return vehicle.maintenanceRecords
    .filter(r => !r.isHidden && r.isActive)
    .map(record => {
      const targetOdometer = record.lastServicedOdometer + record.intervalKm;
      const remainingKm = targetOdometer - estimatedOdometer;

      let status: MaintenanceStatus = 'Good';
      if (remainingKm <= 0) {
        status = 'Overdue';
      } else if (remainingKm <= 500) {
        status = 'Due Soon';
      }

      return {
        record,
        status,
        remainingKm
      };
    });
}

export function hasCriticalMaintenance(vehicle: VehicleConfig, rides: Ride[]): boolean {
  const estimated = getEstimatedOdometer(vehicle, rides);
  const statuses = getMaintenanceStatus(vehicle, estimated);
  return statuses.some(s => s.status === 'Overdue' || s.status === 'Due Soon');
}
