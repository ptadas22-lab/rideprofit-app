export type VehicleType = 'bike' | 'auto' | 'car_petrol' | 'car_diesel' | 'car_ev';

export interface VehicleConfig {
  type: VehicleType;
  name: string;
  mileage: number; // km per Litre (or km per kWh for EV)
  fuelUnit: 'Litre' | 'kWh';
  fuelPrice: number; // cost per Litre/kWh
}

export interface Ride {
  id: string;
  platform: 'Cab Ride' | 'Auto Ride' | 'Bike Ride' | 'Delivery Ride' | 'Custom' | 'Personal';
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationSeconds: number;
  distanceKm: number;
  deadKm: number; // Kilometer traveled without passenger for this ride or interval
  earnings: number;
  fuelPriceAtTime: number;
  mileageAtTime: number;
  fuelCost: number;
  profit: number;
  vehicleType: VehicleType;
  notes?: string;
  hasGPSPath: boolean;
  rideCategory?: string;
  dynamicFields?: any;
}

export interface TrackingSession {
  isActive: boolean;
  startTime: string | null;
  platform: 'Cab Ride' | 'Auto Ride' | 'Bike Ride' | 'Delivery Ride' | 'Custom' | 'Personal';
  currentDistance: number;
  currentDeadKm: number;
  gpsTracked: boolean;
  coordinates: Array<{ lat: number; lng: number; timestamp: number }>;
}

export const VEHICLE_PRESETS: Record<VehicleType, Omit<VehicleConfig, 'fuelPrice'>> = {
  bike: {
    type: 'bike',
    name: 'Bike Taxi',
    mileage: 45.0,
    fuelUnit: 'Litre',
  },
  auto: {
    type: 'auto',
    name: 'Auto Rickshaw',
    mileage: 26.0,
    fuelUnit: 'Litre',
  },
  car_petrol: {
    type: 'car_petrol',
    name: 'Petrol Sedan/Hatchback',
    mileage: 14.5,
    fuelUnit: 'Litre',
  },
  car_diesel: {
    type: 'car_diesel',
    name: 'Diesel Cab',
    mileage: 18.0,
    fuelUnit: 'Litre',
  },
  car_ev: {
    type: 'car_ev',
    name: 'Electric Cab (EV)',
    mileage: 7.2, // km per kWh
    fuelUnit: 'kWh',
  },
};
