import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Ride, VehicleConfig, VEHICLE_PRESETS, VehicleType } from './types';
import Dashboard from './components/Dashboard';
import RideTracker from './components/RideTracker';
import RideHistory from './components/RideHistory';
import Calculator from './components/Calculator';
import Settings from './components/Settings';
import NotificationCenter from './components/NotificationCenter';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ForgotPasswordPage from './components/auth/ForgotPasswordPage';
import PhoneLoginPage from './components/auth/PhoneLoginPage';
import OtpVerificationPage from './components/auth/OtpVerificationPage';
import { useSmartNotifications } from './hooks/useSmartNotifications';
import { getEstimatedOdometer } from './utils/maintenance';
import { 
  Compass, 
  TrendingUp, 
  SlidersHorizontal, 
  History, 
  Settings as SettingsIcon, 
  Bell
} from 'lucide-react';
import { feedbackAudio, triggerHapticFeedback } from './utils/audio';

const LOCAL_STORAGE_RIDES_KEY = 'rideprofit_rides_db';
const LOCAL_STORAGE_VEHICLE_KEY = 'rideprofit_vehicle_db';
const LOCAL_STORAGE_CURRENCY_KEY = 'rideprofit_currency';

const INITIAL_DEMO_RIDES: Ride[] = [];

function AppContent() {

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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans carbon-overlay selection:bg-green-500 selection:text-gray-900" id="app_frame">
      
      <header className="sticky top-0 z-50 bg-gray-800/95 backdrop-blur-md border-b border-white/10 shadow-lg" id="main_driver_header">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-gray-900 font-black text-2xl shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              RP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[28px] text-white tracking-tight leading-none">RideProfit</span>
                <span className="text-[10px] bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-0.5 rounded font-black tracking-widest mt-1">DRIVE</span>
              </div>
              <p className="text-[13px] text-gray-400 font-medium mt-0.5">Keep track of your real driving profit</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-gray-700 border border-white/10 p-2 px-4 rounded-xl text-right hidden xs:block">
              <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider block">Today's Profit</span>
              <span className={`text-[20px] font-black font-mono leading-none ${totalSessionProfit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
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
              className="relative p-3 bg-gray-700 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-zinc-950 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-6" id="main_payload">
        
        <div className="flex overflow-x-auto gap-3 no-scrollbar pt-2 sticky top-[80px] bg-gray-900/95 backdrop-blur-sm z-40 py-3 rounded-xl border-b border-white/10" id="tabs_navigation">
          {[
            { id: 'tracker', label: 'Start Ride', icon: <Compass className="w-6 h-6" /> },
            { id: 'dashboard', label: "Today's Profit", icon: <TrendingUp className="w-6 h-6" /> },
            { id: 'calculator', label: 'Offer Checker', icon: <SlidersHorizontal className="w-6 h-6" /> },
            { id: 'history', label: 'Past Rides', icon: <History className="w-6 h-6" /> },
            { id: 'settings', label: 'My Vehicle', icon: <SettingsIcon className="w-6 h-6" /> },
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
                className={`py-3.5 px-6 rounded-xl text-[15px] font-black cursor-pointer flex items-center gap-2.5 shrink-0 transition-all ${
                  isSelected 
                    ? 'bg-green-500 text-gray-900 shadow-md scale-102' 
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-white/10 hover:border-gray-600 hover:bg-gray-700'
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

      <footer className="mt-auto border-t border-white/10 py-6 bg-gray-800" id="main_driver_footer">
        <div className="max-w-7xl mx-auto px-4 text-center text-[13px] text-gray-500 font-medium">
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
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/phone-login" element={<PhoneLoginPage />} />
            <Route path="/verify-otp" element={<OtpVerificationPage />} />
            
            <Route path="/app" element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
