import { Car, Bike, Navigation, Map, Shield } from 'lucide-react';

export interface RideCategory {
  id: string;
  label: string;
}

export interface DynamicField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'select';
  options?: string[]; // strictly for select fields
  placeholder?: string;
  suffix?: string;
}

export interface RideProfile {
  id: 'Cab Ride' | 'Auto Ride' | 'Bike Ride' | 'Delivery Ride' | 'Personal' | 'Custom';
  name: string;
  icon: any; // Lucide icon
  color: string; // TailWind color name
  accentClass: string; // Tailwind text/glow classes
  badgeClass: string; // Tailwind background/border classes
  description: string;
  showDeadKm: boolean;
  showEarnings: boolean;
  showRideCategory: boolean;
  version: string;
  categoryLabel: string;
  categories: RideCategory[];
  dynamicFields: DynamicField[];
}

export const RIDE_PROFILES: Record<string, RideProfile> = {
  'Cab Ride': {
    id: 'Cab Ride',
    name: 'Cab Ride',
    icon: Car,
    color: 'yellow-400',
    accentClass: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    description: 'Track earnings and expenses for commercial cab services.',
    showDeadKm: true,
    showEarnings: true,
    showRideCategory: true,
    version: '1.0',
    categoryLabel: 'Service Category',
    categories: [
      { id: 'city_ride', label: 'City Ride' },
      { id: 'airport_ride', label: 'Airport Ride' },
      { id: 'rental_ride', label: 'Rental Ride' },
      { id: 'outstation_ride', label: 'Outstation Ride' },
      { id: 'corporate_ride', label: 'Corporate Ride' },
      { id: 'other', label: 'Other' }
    ],
    dynamicFields: [
      { id: 'tips', label: 'Tips', type: 'number' },
      { id: 'tollCharges', label: 'Toll Charges', type: 'number' }
    ]
  },
  'Auto Ride': {
    id: 'Auto Ride',
    name: 'Auto Ride',
    icon: Car, // Assuming a generic icon or custom auto icon
    color: 'emerald-400',
    accentClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    description: 'Track earnings for auto rickshaw street pickups and bookings.',
    showDeadKm: true,
    showEarnings: true,
    showRideCategory: true,
    version: '1.0',
    categoryLabel: 'Service Category',
    categories: [
      { id: 'city_ride', label: 'City Ride' },
      { id: 'shared_ride', label: 'Shared Ride' },
      { id: 'local_booking', label: 'Local Booking' },
      { id: 'street_pickup', label: 'Street Pickup' },
      { id: 'other', label: 'Other' }
    ],
    dynamicFields: [
      { id: 'waitingTimeMins', label: 'Waiting Time', type: 'number', suffix: 'Min' },
      { id: 'fuelType', label: 'Fuel Type', type: 'select', options: ['Petrol', 'CNG'] }
    ]
  },
  'Bike Ride': {
    id: 'Bike Ride',
    name: 'Bike Ride',
    icon: Bike,
    color: 'blue-400',
    accentClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    description: 'Track earnings for passenger bike taxis and express trips.',
    showDeadKm: true,
    showEarnings: true,
    showRideCategory: true,
    version: '1.0',
    categoryLabel: 'Ride Category',
    categories: [
      { id: 'passenger_ride', label: 'Passenger Ride' },
      { id: 'parcel_delivery', label: 'Parcel Delivery' },
      { id: 'document_delivery', label: 'Document Delivery' },
      { id: 'express_ride', label: 'Express Ride' },
      { id: 'other', label: 'Other' }
    ],
    dynamicFields: [
      { id: 'ordersCompleted', label: 'Orders Completed', type: 'number' }
    ]
  },
  'Delivery Ride': {
    id: 'Delivery Ride',
    name: 'Delivery Ride',
    icon: Navigation,
    color: 'orange-400',
    accentClass: 'text-orange-400',
    badgeClass: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    description: 'Track earnings for food and parcel delivery platforms.',
    showDeadKm: true,
    showEarnings: true,
    showRideCategory: true,
    version: '1.0',
    categoryLabel: 'Delivery Type',
    categories: [
      { id: 'food_delivery', label: 'Food Delivery' },
      { id: 'grocery_delivery', label: 'Grocery Delivery' },
      { id: 'pharmacy_delivery', label: 'Pharmacy Delivery' },
      { id: 'smart_store_delivery', label: 'Smart Store Delivery' },
      { id: 'parcel_delivery', label: 'Parcel Delivery' },
      { id: 'document_delivery', label: 'Document Delivery' },
      { id: 'other', label: 'Other' }
    ],
    dynamicFields: [
      { id: 'ordersCompleted', label: 'Orders Completed', type: 'number' },
      { id: 'pickupDistance', label: 'Pickup Distance', type: 'number', suffix: 'KM' },
      { id: 'deliveryDistance', label: 'Delivery Distance', type: 'number', suffix: 'KM' }
    ]
  },
  'Personal': {
    id: 'Personal',
    name: 'Personal Ride',
    icon: Shield,
    color: 'purple-400',
    accentClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    description: 'Log your personal trips without affecting your commercial earning metrics.',
    showDeadKm: false,
    showEarnings: false,
    showRideCategory: true,
    version: '1.0',
    categoryLabel: 'Trip Purpose',
    categories: [
      { id: 'office', label: 'Office' },
      { id: 'family', label: 'Family' },
      { id: 'shopping', label: 'Shopping' },
      { id: 'vacation', label: 'Vacation' },
      { id: 'medical', label: 'Medical' },
      { id: 'education', label: 'Education' },
      { id: 'personal_work', label: 'Personal Work' },
      { id: 'other', label: 'Other' }
    ],
    dynamicFields: [
      { id: 'tripExpense', label: 'Trip Expense', type: 'number' }
    ]
  },
  'Custom': {
    id: 'Custom',
    name: 'Custom',
    icon: Map,
    color: 'zinc-400',
    accentClass: 'text-zinc-400',
    badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    description: 'Custom ride profile.',
    showDeadKm: true,
    showEarnings: true,
    showRideCategory: false,
    version: '1.0',
    categoryLabel: 'Category',
    categories: [],
    dynamicFields: []
  }
};
