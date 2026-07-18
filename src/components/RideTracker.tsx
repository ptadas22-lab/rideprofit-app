import React, { useState, useEffect, useRef } from 'react';
import { registerPlugin, Capacitor } from '@capacitor/core';
import { TrackingSession, VehicleConfig, Ride } from '../types';
import { RIDE_PROFILES } from '../config/rideProfiles';
import { calculateHaversineDistance, formatDistance, formatDuration } from '../utils/geo';

const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Play, 
  Square, 
  MapPin, 
  AlertCircle, 
  Activity, 
  Compass, 
  Timer, 
  DollarSign, 
  Car, 
  Check, 
  Navigation,
  Sparkles,
  RefreshCw,
  TrendingUp,
  MapPinOff,
  UserCheck
} from 'lucide-react';

interface RideTrackerProps {
  vehicle: VehicleConfig;
  currency: string;
  onRideLogged: (ride: Ride) => void;
}

export default function RideTracker({ vehicle, currency, onRideLogged }: RideTrackerProps) {
  // Tracking states
  const [isTracking, setIsTracking] = useState(() => {
    return localStorage.getItem('rideprofit_active_is_tracking') === 'true';
  });
  const [platform, setPlatform] = useState<Ride['platform']>(() => {
    return (localStorage.getItem('rideprofit_active_platform') as Ride['platform']) || 'Cab Ride';
  });
  const [durationSeconds, setDurationSeconds] = useState(() => {
    return parseInt(localStorage.getItem('rideprofit_active_duration_seconds') || '0', 10);
  });
  const [distanceKm, setDistanceKm] = useState(() => {
    return parseFloat(localStorage.getItem('rideprofit_active_distance_km') || '0');
  });
  const [deadKm, setDeadKm] = useState(() => {
    return parseFloat(localStorage.getItem('rideprofit_active_dead_km') || '0');
  });
  
  // High contrast switches
  const [isDeadKmMode, setIsDeadKmMode] = useState(() => {
    return localStorage.getItem('rideprofit_active_is_dead_km_mode') === 'true';
  });
  const useSimulation = false;
  const simulationSpeed = 45;
  
  // Real GPS feedback
  const [geoError, setGeoError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsCoordinates, setGpsCoordinates] = useState<Array<{lat: number, lng: number}>>(() => {
    try {
      const saved = localStorage.getItem('rideprofit_active_gps_coordinates');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // End Ride Form
  const [showEndModal, setShowEndModal] = useState(() => {
    return localStorage.getItem('rideprofit_active_show_end_modal') === 'true';
  });
  const [finalEarnings, setFinalEarnings] = useState(() => {
    return localStorage.getItem('rideprofit_active_final_earnings') || '';
  });
  const [rideNotes, setRideNotes] = useState(() => {
    return localStorage.getItem('rideprofit_active_ride_notes') || '';
  });

  // Dynamic Profile Data State
  const activeProfile = RIDE_PROFILES[platform] || RIDE_PROFILES['Cab Ride'];
  
  const [rideCategory, setRideCategory] = useState(() => {
    return localStorage.getItem('rideprofit_active_ride_category') || '';
  });
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem('rideprofit_active_dynamic_fields');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Timers and Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevCoordsRef = useRef<{lat: number, lng: number} | null>(null);
  const startTimeRef = useRef<string | null>(localStorage.getItem('rideprofit_active_start_time'));

  // Sync states to localStorage
  useEffect(() => {
    localStorage.setItem('rideprofit_active_is_tracking', String(isTracking));
  }, [isTracking]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_platform', platform);
    
    // Auto-select first category when profile changes
    const profile = RIDE_PROFILES[platform];
    if (profile && profile.categories.length > 0 && !profile.categories.find(c => c.id === rideCategory)) {
      setRideCategory(profile.categories[0].id);
    }
  }, [platform]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_ride_category', rideCategory);
  }, [rideCategory]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_dynamic_fields', JSON.stringify(dynamicFields));
  }, [dynamicFields]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_duration_seconds', String(durationSeconds));
  }, [durationSeconds]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_distance_km', String(distanceKm));
  }, [distanceKm]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_dead_km', String(deadKm));
  }, [deadKm]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_is_dead_km_mode', String(isDeadKmMode));
  }, [isDeadKmMode]);

  // Simulation storage sync removed for production release

  useEffect(() => {
    localStorage.setItem('rideprofit_active_gps_coordinates', JSON.stringify(gpsCoordinates));
  }, [gpsCoordinates]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_show_end_modal', String(showEndModal));
  }, [showEndModal]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_final_earnings', finalEarnings);
  }, [finalEarnings]);

  useEffect(() => {
    localStorage.setItem('rideprofit_active_ride_notes', rideNotes);
  }, [rideNotes]);

  // Helper to clear localStorage on save or discard
  const clearActiveTrackingLocalStorage = () => {
    localStorage.removeItem('rideprofit_active_is_tracking');
    localStorage.removeItem('rideprofit_active_platform');
    localStorage.removeItem('rideprofit_active_duration_seconds');
    localStorage.removeItem('rideprofit_active_distance_km');
    localStorage.removeItem('rideprofit_active_dead_km');
    localStorage.removeItem('rideprofit_active_is_dead_km_mode');
    localStorage.removeItem('rideprofit_active_use_simulation');
    localStorage.removeItem('rideprofit_active_simulation_speed');
    localStorage.removeItem('rideprofit_active_gps_coordinates');
    localStorage.removeItem('rideprofit_active_show_end_modal');
    localStorage.removeItem('rideprofit_active_final_earnings');
    localStorage.removeItem('rideprofit_active_ride_notes');
    localStorage.removeItem('rideprofit_active_start_time');
    localStorage.removeItem('rideprofit_active_ride_category');
    localStorage.removeItem('rideprofit_active_dynamic_fields');
  };

  // Sound effect helpers
  const triggerStartSequence = () => {
    feedbackAudio.playStartSound();
    triggerHapticFeedback([120, 80, 120]);
  };

  const triggerStopSequence = () => {
    feedbackAudio.playStopSound();
    triggerHapticFeedback(150);
  };

  const triggerClick = () => {
    feedbackAudio.playClickSound();
    triggerHapticFeedback(40);
  };

  // 1. Duration Tracker - Absolute and immune to screen locks or CPU throttles
  useEffect(() => {
    if (isTracking && startTimeRef.current) {
      const start = new Date(startTimeRef.current).getTime();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setDurationSeconds(elapsed >= 0 ? elapsed : 0);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking]);

  // 1b. Visibility change catch-up (unlock / tab restore / wake-up)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTracking && startTimeRef.current) {
        const start = new Date(startTimeRef.current).getTime();
        const elapsed = Math.floor((Date.now() - start) / 1000);
        setDurationSeconds(elapsed >= 0 ? elapsed : 0);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTracking]);

  // 2. Real Geolocation Watcher (Mobile Background Location / Browser Geolocation)
  useEffect(() => {
    let nativeWatcherId: string | null = null;
    let browserWatcherId: number | null = null;

    if (isTracking && !useSimulation) {
      setGeoError(null);

      // Check if running on Android/iOS Capacitor native platform
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "Tracking your fare and fuel profit in background...",
            backgroundTitle: "RideProfit GPS Active",
            requestPermissions: true,
            stale: false,
            distanceFilter: 2, // Capture updates every 2 meters for high-precision
          },
          (location: any, error: any) => {
            if (error) {
              console.error("Background GPS Error:", error);
              setGeoError("Background GPS failed: " + (error.message || error));
              return;
            }
            if (location) {
              const { latitude, longitude, accuracy } = location;
              setGpsAccuracy(accuracy || 5);

              const currentPoint = { lat: latitude, lng: longitude };
              setGpsCoordinates(prev => [...prev, currentPoint]);

              if (prevCoordsRef.current) {
                const delta = calculateHaversineDistance(
                  prevCoordsRef.current.lat,
                  prevCoordsRef.current.lng,
                  latitude,
                  longitude
                );

                // Jitter filters identical to browser geolocation
                if (delta > 0.005 && (!accuracy || accuracy < 40)) {
                  if (isDeadKmMode) {
                    setDeadKm(prev => prev + delta);
                  } else {
                    setDistanceKm(prev => prev + delta);
                  }
                } else if (delta > 0.002 && (!accuracy || accuracy < 15)) {
                  if (isDeadKmMode) {
                    setDeadKm(prev => prev + delta);
                  } else {
                    setDistanceKm(prev => prev + delta);
                  }
                }
              }
              prevCoordsRef.current = currentPoint;
            }
          }
        ).then((watcherId: string) => {
          nativeWatcherId = watcherId;
        }).catch((err: any) => {
          console.error("Native watcher failed:", err);
          setGeoError("Failed to start Background GPS.");
        });
      } else {
        // Fallback to standard web browser Geolocation API
        if ('geolocation' in navigator) {
          browserWatcherId = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude, longitude, accuracy } = position.coords;
              setGpsAccuracy(accuracy);
              
              const currentPoint = { lat: latitude, lng: longitude };
              setGpsCoordinates(prev => [...prev, currentPoint]);

              if (prevCoordsRef.current) {
                const delta = calculateHaversineDistance(
                  prevCoordsRef.current.lat,
                  prevCoordsRef.current.lng,
                  latitude,
                  longitude
                );

                if (delta > 0.005 && accuracy < 40) {
                  if (isDeadKmMode) {
                    setDeadKm(prev => prev + delta);
                  } else {
                    setDistanceKm(prev => prev + delta);
                  }
                } else if (delta > 0.002 && accuracy < 15) {
                  if (isDeadKmMode) {
                    setDeadKm(prev => prev + delta);
                  } else {
                    setDistanceKm(prev => prev + delta);
                  }
                }
              }

              prevCoordsRef.current = currentPoint;
            },
            (error) => {
              console.error('Geo error:', error);
              let errorMessage = 'GPS unavailable. Try Simulation Mode.';
              if (error.code === 1) errorMessage = 'GPS Permission Denied. Using browser standard defaults.';
              setGeoError(errorMessage);
              setGpsAccuracy(null);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 1000,
              timeout: 5000
            }
          );
        } else {
          setGeoError('Geolocation API not supported by browser.');
        }
      }
    } else {
      prevCoordsRef.current = null;
      setGpsAccuracy(null);
    }

    return () => {
      if (nativeWatcherId) {
        BackgroundGeolocation.removeWatcher({ id: nativeWatcherId }).catch((err: any) => {
          console.error("Failed to remove native watcher:", err);
        });
      }
      if (browserWatcherId !== null) {
        navigator.geolocation.clearWatch(browserWatcherId);
      }
    };
  }, [isTracking, useSimulation, isDeadKmMode]);

  // 3. Driver GPS Simulation Mode (For indoor testing and desktop frame browser verification)
  useEffect(() => {
    if (isTracking && useSimulation) {
      setGeoError(null);
      // Center of city simulation coordinates (e.g. San Francisco or Mumbai depending on context)
      // We will anchor to standard 12.9716, 77.5946 (Bangalore, ride-hailing hub)
      let currentLat = prevCoordsRef.current?.lat || 12.9716;
      let currentLng = prevCoordsRef.current?.lng || 77.5946;
      
      let stepsCounter = 0;

      simulationIntervalRef.current = setInterval(() => {
        stepsCounter++;
        // Calculate incremental distance mapped to speed
        // Speed in km/h to distance in km per 2 seconds:
        // Distance per second = Speed / 3600. Per 2s = Speed * 2 / 3600 = Speed / 1800
        const delta = simulationSpeed / 1800;

        // Generate coordinate sweeping vectors
        const angle = (stepsCounter * 30 * Math.PI) / 180;
        // 1 deg is roughly 111km. delta / 111 is degree offset
        const degOffset = delta / 111;
        currentLat += Math.sin(angle) * degOffset;
        currentLng += Math.cos(angle) * degOffset;

        const currentPoint = { lat: currentLat, lng: currentLng };
        setGpsCoordinates(prev => [...prev, currentPoint]);
        setGpsAccuracy(Math.floor(3 + Math.random() * 4)); // Pristine 3-7m GPS accuracy simulated

        if (isDeadKmMode) {
          setDeadKm(prev => prev + delta);
        } else {
          setDistanceKm(prev => prev + delta);
        }

        prevCoordsRef.current = currentPoint;
      }, 2000);
    } else {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    }

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isTracking, useSimulation, simulationSpeed, isDeadKmMode]);

  const handleStartTracking = () => {
    triggerStartSequence();
    setIsTracking(true);
    setDurationSeconds(0);
    setDistanceKm(0);
    setDeadKm(0);
    setGpsCoordinates([]);
    setGeoError(null);
    setIsDeadKmMode(false);
    const nowStr = new Date().toISOString();
    startTimeRef.current = nowStr;
    localStorage.setItem('rideprofit_active_start_time', nowStr);
  };

  const handleStopTracking = () => {
    triggerStopSequence();
    setIsTracking(false);
    
    // Auto calculate suggested initial earning based on common pricing metrics (e.g., fuel costs * 3 + distance base fare)
    // to make driver experience frictionless
    const approxFares: Record<string, number> = { 'Cab Ride': 16, 'Auto Ride': 15, 'Bike Ride': 8, 'Delivery Ride': 12, Custom: 10, Personal: 0 };
    const baseRate = approxFares[platform] || 10;
    const suggestedEarning = (distanceKm * baseRate) + (activeProfile.showEarnings ? 5 : 0);
    
    setFinalEarnings(!activeProfile.showEarnings ? '0' : (suggestedEarning > 0 ? Math.round(suggestedEarning).toString() : '0'));
    setRideNotes('');
    
    // Ensure category is set
    if (activeProfile.categories.length > 0 && !activeProfile.categories.find(c => c.id === rideCategory)) {
      setRideCategory(activeProfile.categories[0].id);
    }
    
    // Set default dynamic fields
    const defaultFields: Record<string, any> = {};
    activeProfile.dynamicFields.forEach(f => {
      if (f.type === 'select' && f.options && f.options.length > 0) {
        defaultFields[f.id] = f.options[0];
      }
    });
    setDynamicFields(defaultFields);
    
    setShowEndModal(true);
  };

  const handleCancelTracking = () => {
    triggerClick();
    if (window.confirm('Discard active tracking session data?')) {
      setIsTracking(false);
      setDurationSeconds(0);
      setDistanceKm(0);
      setDeadKm(0);
      setGpsCoordinates([]);
      clearActiveTrackingLocalStorage();
    }
  };

  const handleSaveRide = (e: React.FormEvent) => {
    e.preventDefault();
    triggerStartSequence(); // Satisfying click

    const earningsVal = !activeProfile.showEarnings ? 0 : (parseFloat(finalEarnings) || 0);
    const totalDist = distanceKm + deadKm;
    const totalFuelUsed = totalDist / (vehicle.mileage || 1);
    const calculatedFuelCost = totalFuelUsed * vehicle.fuelPrice;
    const netProfit = earningsVal - calculatedFuelCost;

    const loggedRide: Ride = {
      id: `ride_${Date.now()}`,
      platform,
      startTime: startTimeRef.current || new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds,
      distanceKm: parseFloat(distanceKm.toFixed(3)),
      deadKm: parseFloat(deadKm.toFixed(3)),
      earnings: earningsVal,
      fuelPriceAtTime: vehicle.fuelPrice,
      mileageAtTime: vehicle.mileage,
      fuelCost: parseFloat(calculatedFuelCost.toFixed(2)),
      profit: parseFloat(netProfit.toFixed(2)),
      vehicleType: vehicle.type,
      notes: rideNotes.trim() || undefined,
      hasGPSPath: gpsCoordinates.length > 0,
      rideCategory: activeProfile.showRideCategory ? rideCategory : undefined,
      dynamicFields: Object.keys(dynamicFields).length > 0 ? dynamicFields : undefined
    };

    onRideLogged(loggedRide);
    setShowEndModal(false);
    
    // Reset tracker counters
    setDurationSeconds(0);
    setDistanceKm(0);
    setDeadKm(0);
    setGpsCoordinates([]);
    clearActiveTrackingLocalStorage();
  };

  // Instant Profit estimation during live route!
  const estimatedFuelCost = ((distanceKm + deadKm) / (vehicle.mileage || 1)) * vehicle.fuelPrice;

  return (
    <div className="space-y-4" id="ride_tracker_cockpit">
      {/* App & Fake GPS Controls */}
      <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col gap-4 shadow-sm" id="platform_control_row">
        <div>
          <label className="text-xs font-black text-green-400 uppercase tracking-wider">Ride Type</label>
          <div className="flex flex-wrap gap-2 mt-2" id="platform_pills">
            {Object.values(RIDE_PROFILES).map((p) => {
              if (p.id === 'Custom') return null; // Hide custom from active tracker list
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  disabled={isTracking}
                  onClick={() => { triggerClick(); setPlatform(p.id); }}
                  className={`py-2.5 px-4 rounded-xl text-sm font-black cursor-pointer flex items-center gap-2 transition-all border-b-2 ${
                    platform === p.id 
                      ? `bg-zinc-900 border-${p.color} ${p.accentClass} shadow-md` 
                      : 'bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Simulation switch removed for production release */}
      </div>

      {/* Main HUD (Heads-Up Display) Panel */}
      <div className="p-5 bg-zinc-950 text-white rounded-xl border border-zinc-900 shadow-md relative overflow-hidden" id="navigation_hud_display">
        {isTracking && (
          <div className="absolute top-4 right-4 flex items-center gap-1 py-1 px-2.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded text-[10px] font-black uppercase tracking-widest animate-pulse">
            <Activity className="w-3.5 h-3.5" /> DRIVING NOW
          </div>
        )}

        {/* HUD Grid Metrics */}
        <div className={`grid gap-4 pt-2 ${activeProfile.showDeadKm ? 'grid-cols-2' : 'grid-cols-2'}`} id="live_metrics_scrow">
          {/* Active Ride Distance */}
          <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-900">
            <span className="text-xs text-zinc-400 uppercase tracking-wide flex items-center gap-1 font-bold">
              <Navigation className={`w-4 h-4 ${activeProfile.accentClass}`} /> {activeProfile.showDeadKm ? 'Earning KM' : 'Distance'}
            </span>
            <div className="flex items-baseline gap-1 pt-1">
              <span className={`text-3xl sm:text-4xl font-black text-white font-mono ${activeProfile.accentClass.replace('text-', 'glow-')}`}>
                {distanceKm.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500 font-bold">KM</span>
            </div>
            <p className="text-[10px] text-zinc-500">{activeProfile.showDeadKm ? 'With customer' : 'Total driven'}</p>
          </div>

          {/* Unpaid Dead Distance (Conditionally Hidden) */}
          {activeProfile.showDeadKm && (
            <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-900">
              <span className="text-xs text-zinc-400 uppercase tracking-wide flex items-center gap-1 font-bold">
                <MapPinOff className="w-4 h-4 text-amber-500" /> Non-Earning KM
              </span>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-3xl sm:text-4xl font-black text-amber-500 font-mono">
                  {deadKm.toFixed(2)}
                </span>
                <span className="text-xs text-zinc-500 font-bold">KM</span>
              </div>
              <p className="text-[10px] text-amber-500/70">Without customer</p>
            </div>
          )}

          {/* Travel Duration */}
          <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-900">
            <span className="text-xs text-zinc-400 uppercase tracking-wide flex items-center gap-1 font-bold">
              <Timer className="w-4 h-4 text-emerald-400" /> {activeProfile.showDeadKm ? 'Ride Time' : 'Drive Time'}
            </span>
            <div className="pt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 block">
                {formatDuration(durationSeconds)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">Time spent so far</p>
          </div>

          {/* estimated fuel cost / mileage overlay */}
          <div className="space-y-1 bg-zinc-900/40 p-3 rounded-lg border border-zinc-900">
            <span className="text-xs text-zinc-400 uppercase tracking-wide flex items-center gap-1 font-bold">
              {activeProfile.id === 'Personal' ? (
                <><Activity className="w-4 h-4 text-purple-400" /> Mileage</>
              ) : (
                <><Compass className="w-4 h-4 text-red-400" /> Fuel Cost</>
              )}
            </span>
            <div className="flex items-baseline gap-1 pt-1">
              {activeProfile.id === 'Personal' ? (
                <span className="text-3xl sm:text-4xl font-black text-purple-400 font-mono">
                  {vehicle.mileage}
                </span>
              ) : (
                <span className="text-3xl sm:text-4xl font-black text-red-500 font-mono">
                  {currency}{estimatedFuelCost.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-500">{activeProfile.id === 'Personal' ? `${vehicle.fuelUnit} / KM` : 'Calculated fuel loss'}</p>
          </div>
        </div>

        {/* GPS Satellite Connectivity Bar */}
        <div className="border-t border-zinc-900 mt-4 pt-3 flex flex-wrap justify-between items-center gap-2 text-[10px] uppercase font-black tracking-wider text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${isTracking ? 'bg-green-500 animate-ping' : 'bg-zinc-800'}`}></div>
            <span>
              {isTracking ? 'GPS is ON' : 'GPS is OFF'}
            </span>
          </div>

          {geoError && (
            <div className="text-red-400 text-[10px] font-bold">
              <span>{geoError}</span>
            </div>
          )}
        </div>

        {/* Speed limit controls removed for production release */}
      </div>

      {/* TACTILE COCKPIT CONTROLS - GIANT TOUCH TARGETS */}
      <div className="flex flex-col gap-3" id="tactile_hud_actions">
        
        <div className="flex flex-col gap-3">
          {!isTracking ? (
              <button
                onClick={handleStartTracking}
                className={`w-full py-6 bg-zinc-900 active:scale-95 text-zinc-100 rounded-xl font-black text-2xl tracking-wide shadow-lg border-b-8 border-zinc-950 text-center flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110 ${activeProfile.badgeClass}`}
                id="btn_start_tracking"
              >
                <Play className="w-8 h-8 fill-current" />
                START {activeProfile.name.toUpperCase()}
              </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Red Stop Button */}
              <button
                onClick={handleStopTracking}
                className="py-5 bg-red-650 hover:bg-red-600 text-white rounded-xl font-black text-lg border-b-6 border-red-800 text-center flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95"
                id="btn_stop_tracking"
              >
                <Square className="w-6 h-6 fill-current mb-0.5" />
                <span>FINISH RIDE</span>
              </button>

              {/* Cancel Button */}
              <button
                onClick={handleCancelTracking}
                className="py-5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-xl font-black text-center flex items-center justify-center gap-1 cursor-pointer active:scale-95 text-base"
                id="btn_reset_tracking"
              >
                <RefreshCw className="w-5 h-5 text-zinc-500" />
                <span>CANCEL</span>
              </button>
            </div>
          )}
        </div>

        {/* ACTIVE CRUISE TACTILE TOGGLE (Dead KM Counter) */}
        {activeProfile.showDeadKm && (
          <div>
            <button
              disabled={!isTracking}
              onClick={() => {
                triggerClick();
                setIsDeadKmMode(!isDeadKmMode);
              }}
              className={`w-full py-5 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                !isTracking
                  ? 'bg-zinc-950/40 border-zinc-900 text-zinc-700 cursor-not-allowed opacity-30'
                  : isDeadKmMode
                    ? 'bg-amber-500 border-amber-600 text-black font-black shadow-md'
                    : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300'
              }`}
              id="btn_dead_km_shunter"
            >
              {isDeadKmMode ? (
                <>
                  <MapPinOff className="w-8 h-8 mb-1 text-black animate-bounce" />
                  <span className="text-base uppercase tracking-wider font-black">SEARCHING FOR CUSTOMER</span>
                  <span className="text-xs opacity-90 font-bold">(Counting Non-Earning KM now)</span>
                </>
              ) : (
                <>
                  <UserCheck className={`w-8 h-8 mb-1 ${activeProfile.accentClass}`} />
                  <span className="text-base uppercase tracking-wider font-black">CUSTOMER IN RIDE</span>
                  <span className="text-xs text-zinc-500 font-bold">Tap when customer climbs on / ride starts</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Save Ride Modal Popup */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/90 z-55 flex items-center justify-center p-3">
          <div className="bg-zinc-950 rounded-2xl p-5 max-w-md w-full shadow-2xl border border-zinc-900 space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-zinc-900">
              <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <activeProfile.icon className={`w-5 h-5 ${activeProfile.accentClass}`} /> Save Details
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded font-black uppercase ${activeProfile.badgeClass}`}>
                {activeProfile.name}
              </span>
            </div>

            <form onSubmit={handleSaveRide} className="space-y-4">
              {/* Dynamic Ride Category */}
              {activeProfile.showRideCategory && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                    {activeProfile.categoryLabel}
                  </label>
                  <select
                    value={rideCategory}
                    onChange={(e) => setRideCategory(e.target.value)}
                    className="w-full rounded-xl bg-black border border-zinc-800 p-3 text-sm text-zinc-200 focus:outline-none cursor-pointer"
                  >
                    {activeProfile.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Distance Recap */}
              <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-3 rounded-xl border border-zinc-850 text-center">
                <div>
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{activeProfile.showDeadKm ? 'Earning KM' : 'Distance'}</span>
                  <p className="text-lg font-black text-white">{distanceKm.toFixed(2)} km</p>
                </div>
                {activeProfile.showDeadKm && (
                  <div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Non-Earning KM</span>
                    <p className="text-lg font-black text-amber-500">{deadKm.toFixed(2)} km</p>
                  </div>
                )}
              </div>

              {/* Earnings Input / Profile Specific Block */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider">
                  Money you got for this Ride ({currency})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 font-black text-xl">{currency}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    disabled={!activeProfile.showEarnings}
                    value={!activeProfile.showEarnings ? '0' : finalEarnings}
                    onChange={(e) => setFinalEarnings(e.target.value)}
                    className={`pl-9 block w-full rounded-xl bg-black border border-zinc-800 p-3 text-white text-2xl font-black font-mono focus:outline-none focus:border-${activeProfile.color.split('-')[0]}-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder="0.00"
                    autoFocus={activeProfile.showEarnings}
                  />
                </div>
                {!activeProfile.showEarnings ? (
                  <p className={`text-xs ${activeProfile.accentClass} font-bold`}>
                    Personal Trip. No commercial earnings.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 font-bold">
                    Fuel cost was: {currency}{estimatedFuelCost.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Dynamic Fields generated strictly from Ride Profile Config */}
              {activeProfile.dynamicFields.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {activeProfile.dynamicFields.map(field => (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                        {field.label} {field.type === 'currency' ? `(${currency})` : ''}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={dynamicFields[field.id] || ''}
                          onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="block w-full rounded-xl bg-black border border-zinc-800 p-3 text-sm text-zinc-200 focus:outline-none cursor-pointer"
                        >
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="relative">
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            step={field.type === 'number' ? 'any' : undefined}
                            value={dynamicFields[field.id] || ''}
                            onChange={(e) => setDynamicFields(prev => ({ 
                              ...prev, 
                              [field.id]: field.type === 'number' ? (parseFloat(e.target.value) || e.target.value) : e.target.value 
                            }))}
                            placeholder={field.placeholder || "0"}
                            className="block w-full rounded-xl bg-black border border-zinc-800 p-3 text-sm text-zinc-200 focus:outline-none"
                          />
                          {field.suffix && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <span className="text-[10px] text-zinc-500 font-black uppercase">{field.suffix}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Ride Notes */}
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={rideNotes}
                  onChange={(e) => setRideNotes(e.target.value)}
                  className="block w-full rounded-xl bg-black border border-zinc-800 p-3 text-sm text-zinc-200 focus:outline-none"
                  placeholder="e.g. Heavy rain / Traffic delay"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { triggerClick(); setShowEndModal(false); }}
                  className="flex-1 py-3 bg-zinc-900 text-zinc-400 rounded-lg font-black text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 bg-${activeProfile.color.split('-')[0]}-500 text-black rounded-lg font-black text-xs cursor-pointer flex items-center justify-center gap-1 uppercase hover:brightness-110`}
                >
                  <Check className="w-4 h-4 text-black stroke-[3]" /> Save Ride
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
