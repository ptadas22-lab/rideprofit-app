import React, { useState, useEffect } from 'react';
import { Ride, VehicleConfig, VEHICLE_PRESETS, VehicleType } from './types';
import { BETA_ACCESS_CODE } from './config';
import Dashboard from './components/Dashboard';
import RideTracker from './components/RideTracker';
import RideHistory from './components/RideHistory';
import Calculator from './components/Calculator';
import Settings from './components/Settings';
import NotificationCenter from './components/NotificationCenter';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { useSmartNotifications } from './hooks/useSmartNotifications';
import { getEstimatedOdometer } from './utils/maintenance';
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
  AlertTriangle,
  Bell
} from 'lucide-react';
import { hasCriticalMaintenance } from './utils/maintenance';
import { feedbackAudio, triggerHapticFeedback } from './utils/audio';

const LOCAL_STORAGE_RIDES_KEY = 'rideprofit_rides_db';
const LOCAL_STORAGE_VEHICLE_KEY = 'rideprofit_vehicle_db';
const LOCAL_STORAGE_CURRENCY_KEY = 'rideprofit_currency';

const INITIAL_DEMO_RIDES: Ride[] = [];

function AppContent() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('rideprofit_beta_unlocked') === 'true';
    } catch (e) {
      return false;
    }
  });
  const [accessCode, setAccessCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode.trim() === BETA_ACCESS_CODE) {
      try {
        localStorage.setItem('rideprofit_beta_unlocked', 'true');
      } catch (err) {}
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Invalid access code. Please contact app owner.');
    }
  };

  const [rides, setRides] = useState<Ride[]>(() => {
    try {
      const persisted = localStorage.getItem(LOCAL_STORAGE_RIDES_KEY);
      if (persisted) {
        const parsed = JSON.parse(persisted);
        return parsed.map((r: any) => ({
          ...r,
          platform: r.platform === 'Uber' ? 'Cab Ride'
                  : r.platform === 'Ola' ? 'Auto Ride'
                  : r.platform === 'Rapido' ? 'Bike Ride'
                  : r.platform === 'Yandex' ? 'Delivery Ride'
                  : r.platform
        }));
      }
    } catch (e) {
      console.warn('LocalStorage reads failed:', e);
    }
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
    return {
      type: 'car_petrol',
      name: VEHICLE_PRESETS.car_petrol.name,
      mileage: VEHICLE_PRESETS.car_petrol.mileage,
      fuelUnit: VEHICLE_PRESETS.car_petrol.fuelUnit,
      fuelPrice: 96.50
    };
  });

  const [currency, setCurrency] = useState<string>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY) || '₹';
    } catch (e) {
      return '₹';
    }
  });

  const [activeTab, setActiveTab] = useState<'tracker' | 'dashboard' | 'calculator' | 'history' | 'settings'>('tracker');

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RIDES_KEY, JSON.stringify(rides));
    } catch (e) {}
  }, [rides]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VEHICLE_KEY, JSON.stringify(vehicle));
    } catch (e) {}
  }, [vehicle]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, currency);
    } catch (e) {}
  }, [currency]);

  const handleRideLogged = (newRide: Ride) => {
    setRides(prev => [...prev, newRide]);
  };

  const handleRideDeleted = (id: string) => {
    setRides(prev => prev.filter(r => r.id !== id));
  };

  const handleClearAllRides = () => {
    setRides([]);
  };

  const totalSessionProfit = rides.reduce((acc, r) => acc + r.profit, 0);

  // Notifications Integration
  const { unreadCount, setIsCenterOpen } = useNotifications();
  useSmartNotifications(vehicle, rides);

  const handleCompleteMaintenance = (recordId: string) => {
    const estimated = getEstimatedOdometer(vehicle, rides);
    setVehicle(prev => {
      const copy = { ...prev };
      if (copy.maintenanceRecords) {
        copy.maintenanceRecords = copy.maintenanceRecords.map(rec => 
          rec.id === recordId ? { ...rec, lastServicedOdometer: estimated } : rec
        );
      }
      return copy;
    });
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center font-sans px-4 carbon-overlay selection:bg-green-500 selection:text-zinc-950" id="access_frame">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-6 shadow-xl space-y-6 text-center">
          
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-green-500 rounded-xl flex items-center justify-center text-black font-black text-2xl shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              RP
            </div>
            <div className="space-y-1">
              <span className="font-black text-2xl text-white tracking-tight block">RideProfit</span>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Beta Tester Access</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-green-400 uppercase tracking-wider">
                Enter Beta Access Code
              </label>
              <input
                type="text"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="block w-full rounded-xl bg-black border border-zinc-800 p-4 text-center text-xl font-black tracking-widest text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                placeholder="••••••••••••"
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-red-400 bg-red-950/20 border border-red-500/20 p-3 rounded-lg text-xs font-bold" id="error_container">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-green-500 hover:bg-green-400 active:scale-98 text-black rounded-xl font-black text-lg tracking-wide shadow-lg border-b-4 border-green-700 text-center flex items-center justify-center cursor-pointer"
              id="btn_unlock_app"
            >
              UNLOCK APP
            </button>
          </form>

          <div className="border-t border-zinc-900 pt-4 text-xs text-zinc-500 space-y-1">
            <p className="font-medium text-zinc-400">🛡️ Privacy Guarantee</p>
            <p>RideProfit Beta does not collect your personal information. Ride data stays on your phone.</p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans carbon-overlay selection:bg-green-500 selection:text-zinc-950" id="app_frame">
      
      <header className="sticky top-0 z-50 bg-zinc-950/95 border-b border-zinc-900 shadow-md" id="main_driver_header">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-black font-black text-xl shadow-[0_0_10px_rgba(34,197,94,0.2)]">
              RP
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-black text-lg text-white tracking-tight">RideProfit</span>
                <span className="text-[9px] bg-green-500/10 border border-green-500/30 text-green-400 px-1.5 py-0.5 rounded font-black tracking-widest">DRIVE</span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Keep track of your real driving profit</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="bg-zinc-900 border border-zinc-800 p-1 px-3 rounded-lg text-right hidden xs:block">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Today's Profit</span>
              <span className={`text-base font-black font-mono ${totalSessionProfit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
                {totalSessionProfit >= 0 ? '' : '-'}{currency}{Math.abs(totalSessionProfit).toFixed(2)}
              </span>
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => {
                feedbackAudio.playClickSound();
                triggerHapticFeedback(40);
                setIsCenterOpen(true);
              }}
              className="relative p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-zinc-950 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 py-4 flex flex-col gap-4" id="main_payload">
        
        <div className="flex overflow-x-auto gap-2 no-scrollbar pt-1 sticky top-[65px] bg-black/95 z-40 py-2 rounded-xl px-1 border border-zinc-900" id="tabs_navigation">
          {[
            { id: 'tracker', label: 'Start Ride', icon: <Compass className="w-5 h-5" /> },
            { id: 'dashboard', label: "Today's Profit", icon: <TrendingUp className="w-5 h-5" /> },
            { id: 'calculator', label: 'Offer Checker', icon: <SlidersHorizontal className="w-5 h-5" /> },
            { id: 'history', label: 'Past Rides', icon: <History className="w-5 h-5" /> },
            { id: 'settings', label: 'My Vehicle', icon: <SettingsIcon className="w-5 h-5" /> },
          ].map(tab => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  try {
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
                    if ('vibrate' in navigator) navigator.vibrate(25);
                  } catch (e) {}
                  setActiveTab(tab.id as any);
                }}
                className={`py-3 px-5 rounded-xl text-sm font-black cursor-pointer flex items-center gap-2 shrink-0 transition-all ${
                  isSelected 
                    ? 'bg-green-500 text-black shadow-[0_0_12px_rgba(34,197,94,0.3)] scale-102' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

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
              rides={rides}
              vehicle={vehicle} 
              onVehicleChange={setVehicle} 
              currency={currency} 
              onCurrencyChange={setCurrency} 
            />
          )}
        </div>
      </main>

      <footer className="mt-auto border-t border-zinc-900 py-4 bg-zinc-950" id="main_driver_footer">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-zinc-500 font-medium">
          <p>© 2026 RideProfit Dashboard. Made to help taxi, auto, bike, and delivery riders know their real earnings.</p>
        </div>
      </footer>

      {/* Renders Over App View */}
      <NotificationCenter onCompleteMaintenance={handleCompleteMaintenance} />

    </div>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}
