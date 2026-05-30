import React, { useState, useEffect } from 'react';
import { Ride, VehicleConfig, VEHICLE_PRESETS, VehicleType } from './types';
import Dashboard from './components/Dashboard';
import RideTracker from './components/RideTracker';
import RideHistory from './components/RideHistory';
import Calculator from './components/Calculator';
import Settings from './components/Settings';
import { 
  Compass, 
  TrendingUp, 
  PiggyBank, 
  MapPin, 
  SlidersHorizontal, 
  History, 
  Settings as SettingsIcon, 
  Sparkles,
  Zap,
  Navigation,
  Car,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const LOCAL_STORAGE_RIDES_KEY = 'rideprofit_rides_db';
const LOCAL_STORAGE_VEHICLE_KEY = 'rideprofit_vehicle_db';
const LOCAL_STORAGE_CURRENCY_KEY = 'rideprofit_currency';

// Prepopulate standard realistic starter dataset so drivers instantly understand performance metrics
const INITIAL_DEMO_RIDES: Ride[] = [
  {
    id: 'demo_ride_1',
    platform: 'Uber',
    startTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() - 3.5 * 3605 * 1000).toISOString(),
    durationSeconds: 1800,
    distanceKm: 14.5,
    deadKm: 3.2,
    earnings: 280,
    fuelPriceAtTime: 96.50,
    mileageAtTime: 14.5,
    fuelCost: 117.84,
    profit: 162.16,
    vehicleType: 'car_petrol',
    notes: 'Rain traffic near high demand tech park',
    hasGPSPath: true
  },
  {
    id: 'demo_ride_2',
    platform: 'Rapido',
    startTime: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() - 2.3 * 3605 * 1000).toISOString(),
    durationSeconds: 720,
    distanceKm: 5.2,
    deadKm: 1.1,
    earnings: 85,
    fuelPriceAtTime: 96.50,
    mileageAtTime: 45.0,
    fuelCost: 13.51,
    profit: 71.49,
    vehicleType: 'bike',
    notes: 'Short alleyway shortcut passenger pickup',
    hasGPSPath: false
  },
  {
    id: 'demo_ride_3',
    platform: 'Ola',
    startTime: new Date(Date.now() - 1 * 3650 * 1000).toISOString(),
    endTime: new Date(Date.now() - 0.5 * 3605 * 1000).toISOString(),
    durationSeconds: 2100,
    distanceKm: 22.0,
    deadKm: 6.8,
    earnings: 450,
    fuelPriceAtTime: 96.50,
    mileageAtTime: 14.5,
    fuelCost: 191.70,
    profit: 258.30,
    vehicleType: 'car_petrol',
    notes: 'Airport terminal long haul active run',
    hasGPSPath: true
  }
];

export default function App() {
  // 1. Initial configuration loader
  const [rides, setRides] = useState<Ride[]>(() => {
    try {
      const persisted = localStorage.getItem(LOCAL_STORAGE_RIDES_KEY);
      if (persisted) {
        return JSON.parse(persisted);
      }
    } catch (e) {
      console.warn('LocalStorage reads failed:', e);
    }
    // Return sample starter ride ledger for pristine styling demonstration
    return INITIAL_DEMO_RIDES;
  });

  const [vehicle, setVehicle] = useState<VehicleConfig>(() => {
    try {
      const persisted = localStorage.getItem(LOCAL_STORAGE_VEHICLE_KEY);
      if (persisted) {
        return JSON.parse(persisted);
      }
    } catch (e) {
      console.warn('LocalStorage reads failed:', e);
    }
    // Default vehicle preset: car_petrol (Universal and responsive)
    return {
      type: 'car_petrol',
      name: VEHICLE_PRESETS.car_petrol.name,
      mileage: VEHICLE_PRESETS.car_petrol.mileage,
      fuelUnit: VEHICLE_PRESETS.car_petrol.fuelUnit,
      fuelPrice: 96.50 // Standard competitive default pricing
    };
  });

  const [currency, setCurrency] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY) || '₹';
    } catch (e) {
      return '₹';
    }
  });

  // Navigation tab switcher page state
  const [activeTab, setActiveTab] = useState<'tracker' | 'dashboard' | 'calculator' | 'history' | 'settings'>('tracker');

  // Sync to database
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RIDES_KEY, JSON.stringify(rides));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [rides]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VEHICLE_KEY, JSON.stringify(vehicle));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [vehicle]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, currency);
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }, [currency]);

  // Methods
  const handleRideLogged = (newRide: Ride) => {
    setRides(prev => [...prev, newRide]);
  };

  const handleRideDeleted = (id: string) => {
    setRides(prev => prev.filter(r => r.id !== id));
  };

  const handleClearAllRides = () => {
    setRides([]);
  };

  // Live total metrics highlight inside the header
  const totalSessionProfit = rides.reduce((acc, r) => acc + r.profit, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans carbon-overlay selection:bg-green-500 selection:text-zinc-950" id="app_frame">
      
      {/* Universal Ribbon: Sticky Driver Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800/80 shadow-lg shadow-black/10" id="main_driver_header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-zinc-950 font-black text-xl shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              RP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-zinc-50 tracking-tight">RideProfit</span>
                <span className="text-[9px] bg-green-500/10 border border-green-500/25 text-green-400 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest animate-pulse">HUD v1.2</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium tracking-wide">Real-time driver profit & efficiency metrics</p>
            </div>
          </div>

          {/* Quick HUD Metrics (Profit tracker) */}
          <div className="flex items-center gap-3">
            <div className="bg-zinc-900/80 border border-zinc-800/80 p-1 px-2.5 rounded-lg text-right hidden sm:block">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Session Profit</span>
              <span className={`text-sm font-black font-mono ${totalSessionProfit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
                {totalSessionProfit >= 0 ? '' : '-'}{currency}{Math.abs(totalSessionProfit).toFixed(2)}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/80 p-1 px-2.5 rounded-lg text-right">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Active Vehicle</span>
              <span className="text-xs font-bold text-zinc-200 block truncate max-w-[120px]">
                🚗 {vehicle.name}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6" id="main_payload">
        
        {/* Navigation Tabs - Tactile and highly responsive */}
        <div className="flex border-b border-zinc-800/80 overflow-x-auto gap-1.5 no-scrollbar pt-1 sticky top-[69px] bg-zinc-950/90 backdrop-blur-md z-40 py-2.5 rounded-xl px-2 border border-zinc-850" id="tabs_navigation">
          {[
            { id: 'tracker', label: 'Ride Tracker', icon: <Compass className="w-4 h-4" /> },
            { id: 'dashboard', label: 'Diagnostics Profit', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'calculator', label: 'Offer Verifier', icon: <SlidersHorizontal className="w-4 h-4" /> },
            { id: 'history', label: 'Ledger History', icon: <History className="w-4 h-4" /> },
            { id: 'settings', label: 'Vehicle Settings', icon: <SettingsIcon className="w-4 h-4" /> },
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  try {
                    // Play subtle feedback beep
                    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = context.createOscillator();
                    const gain = context.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, context.currentTime);
                    gain.gain.setValueAtTime(0.04, context.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);
                    osc.connect(gain);
                    gain.connect(context.destination);
                    osc.start();
                    osc.stop(context.currentTime + 0.06);
                    if ('vibrate' in navigator) navigator.vibrate(20);
                  } catch (e) {}
                  setActiveTab(tab.id as any);
                }}
                className={`py-2 px-4 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 transition-all ${
                  isSelected 
                    ? 'bg-green-500 text-zinc-950 hover:bg-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-102 font-black' 
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-100 border border-zinc-800/80 hover:bg-zinc-800/60'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Inner Window Payload */}
        <div className="flex-1 pb-16" id="inner_panel_content">
          {activeTab === 'tracker' && (
            <RideTracker 
              vehicle={vehicle} 
              currency={currency} 
              onRideLogged={handleRideLogged} 
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              rides={rides} 
              vehicle={vehicle} 
              currency={currency} 
            />
          )}

          {activeTab === 'calculator' && (
            <Calculator 
              vehicle={vehicle} 
              currency={currency} 
            />
          )}

          {activeTab === 'history' && (
            <RideHistory 
              rides={rides} 
              vehicle={vehicle} 
              currency={currency} 
              onRideLogged={handleRideLogged} 
              onRideDeleted={handleRideDeleted} 
              onClearAllRides={handleClearAllRides} 
            />
          )}

          {activeTab === 'settings' && (
            <Settings 
              vehicle={vehicle} 
              onVehicleChange={setVehicle} 
              currency={currency} 
              onCurrencyChange={setCurrency} 
            />
          )}
        </div>

      </main>

      {/* Embedded footer block - humble professional metadata */}
      <footer className="mt-auto border-t border-zinc-800/80 py-4 bg-zinc-900/60" id="main_driver_footer">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-500 font-medium">
          <p>© 2026 RideProfit Dashboard. Created to protect road-driver earnings, mileage margins, and physical wellness.</p>
        </div>
      </footer>

    </div>
  );
}
