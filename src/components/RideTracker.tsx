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
  const isInstagramBrowser = navigator.userAgent.toLowerCase().includes('instagram');
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
      <div className="bg-gray-800 border border-white/10 p-5 rounded-[18px] flex flex-col gap-4 shadow-md" id="platform_control_row">
        <div>
          <label className="text-xs font-black text-green-400 uppercase tracking-wider">Ride Type</label>
          <div className="flex flex-col gap-3 mt-2" id="platform_pills">
            {Object.values(RIDE_PROFILES).map((p) => {
              if (p.id === 'Custom') return null; // Hide custom from active tracker list
              const Icon = p.icon;
              
              const descriptions: Record<string, string> = {
                'Cab Ride': 'Passenger Taxi',
                'Auto Ride': 'Three Wheeler',
                'Bike Ride': 'Two Wheeler',
                'Delivery Ride': 'Parcel Delivery',
                'Personal': 'Private Trip'
              };
              const desc = descriptions[p.name] || '';

              return (
                <button
                  key={p.id}
                  disabled={isTracking}
                  onClick={() => { triggerClick(); setPlatform(p.id); }}
                  className={`p-4 rounded-[16px] text-left cursor-pointer flex items-center gap-4 transition-all border ${
                    platform === p.id 
                      ? `bg-green-500/10 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]` 
                      : 'bg-gray-700 border-white/10 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${platform === p.id ? 'bg-green-500 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className={`text-[16px] font-black ${platform === p.id ? 'text-green-400 glow-green' : 'text-gray-200'}`}>{p.name}</h4>
                    {desc && <p className={`text-[13px] font-medium ${platform === p.id ? 'text-green-500/80' : 'text-gray-400'}`}>{desc}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Simulation switch removed for production release */}
      </div>

      {/* Main HUD (Heads-Up Display) Panel */}
      <div className="p-6 bg-gray-800 text-white rounded-[18px] border border-white/10 shadow-md relative overflow-hidden" id="navigation_hud_display">
        {isTracking && (
          <div className="absolute top-5 right-5 flex items-center gap-1.5 py-1 px-3 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full text-[11px] font-black uppercase tracking-widest animate-pulse">
            <Activity className="w-4 h-4" /> DRIVING NOW
          </div>
        )}

        {/* HUD Grid Metrics */}
        <div className={`grid gap-4 pt-2 grid-cols-2`} id="live_metrics_scrow">
          {/* Active Ride Distance */}
          <div className="space-y-1 bg-gray-700/50 p-4 rounded-xl border border-white/5">
            <span className="text-[13px] text-gray-400 uppercase tracking-wide flex items-center gap-1.5 font-bold">
              <Navigation className="w-6 h-6 text-blue-400" /> {activeProfile.showDeadKm ? 'Earning KM' : 'Distance'}
            </span>
            <div className="flex items-baseline gap-1 pt-1">
              <span className={`text-[34px] font-black text-white font-mono leading-none`}>
                {distanceKm.toFixed(2)}
              </span>
              <span className="text-[13px] text-gray-500 font-bold ml-1">KM</span>
            </div>
            <p className="text-[12px] text-gray-500 mt-1">{activeProfile.showDeadKm ? 'With customer' : 'Total driven'}</p>
          </div>

          {/* Unpaid Dead Distance (Conditionally Hidden) */}
          {activeProfile.showDeadKm && (
            <div className="space-y-1 bg-gray-700/50 p-4 rounded-xl border border-white/5">
              <span className="text-[13px] text-gray-400 uppercase tracking-wide flex items-center gap-1.5 font-bold">
                <MapPinOff className="w-6 h-6 text-blue-400 opacity-50" /> Non-Earning KM
              </span>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-[34px] font-black text-white font-mono leading-none opacity-80">
                  {deadKm.toFixed(2)}
                </span>
                <span className="text-[13px] text-gray-500 font-bold ml-1">KM</span>
              </div>
              <p className="text-[12px] text-gray-500 mt-1">Without customer</p>
            </div>
          )}

          {/* Travel Duration */}
          <div className="space-y-1 bg-gray-700/50 p-4 rounded-xl border border-white/5">
            <span className="text-[13px] text-gray-400 uppercase tracking-wide flex items-center gap-1.5 font-bold">
              <Timer className="w-6 h-6 text-yellow-400" /> {activeProfile.showDeadKm ? 'Ride Time' : 'Drive Time'}
            </span>
            <div className="pt-1">
              <span className="text-[34px] font-black font-mono text-white leading-none block">
                {formatDuration(durationSeconds)}
              </span>
            </div>
            <p className="text-[12px] text-gray-500 mt-1">Time spent so far</p>
          </div>

          {/* estimated fuel cost / mileage overlay */}
          <div className="space-y-1 bg-gray-700/50 p-4 rounded-xl border border-white/5">
            <span className="text-[13px] text-gray-400 uppercase tracking-wide flex items-center gap-1.5 font-bold">
              {activeProfile.id === 'Personal' ? (
                <><Activity className="w-6 h-6 text-cyan-400" /> Mileage</>
              ) : (
                <><Compass className="w-6 h-6 text-red-500" /> Fuel Cost</>
              )}
            </span>
            <div className="flex items-baseline gap-1 pt-1">
              {activeProfile.id === 'Personal' ? (
                <span className="text-[34px] font-black text-cyan-400 font-mono leading-none">
                  {vehicle.mileage}
                </span>
              ) : (
                <span className="text-[34px] font-black text-red-500 font-mono leading-none">
                  {currency}{estimatedFuelCost.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 mt-1">{activeProfile.id === 'Personal' ? `${vehicle.fuelUnit} / KM` : 'Calculated fuel loss'}</p>
          </div>
        </div>

        {/* GPS Satellite Connectivity Bar */}
        <div className="border-t border-white/10 mt-6 pt-4 flex flex-wrap justify-between items-center gap-2">
          {isTracking ? (
            <div className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center gap-2 text-[12px] font-bold">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              GPS Connected
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center gap-2 text-[12px] font-bold">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              GPS Disconnected
            </div>
          )}

          {geoError && !isInstagramBrowser && (
            <div className="text-red-400 text-[12px] font-bold">
              <span>{geoError}</span>
            </div>
          )}
        </div>

        {/* Instagram Browser Warning */}
        {geoError && isInstagramBrowser && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <h4 className="text-[14px] font-black text-blue-400 uppercase tracking-wide">Open RideProfit in Chrome</h4>
                <p className="text-[12px] text-gray-400 mt-1">Instagram's built-in browser may restrict GPS access. Open RideProfit in Chrome for accurate ride tracking.</p>
              </div>
            </div>
            <button
              onClick={() => {
                const isAndroid = navigator.userAgent.toLowerCase().includes('android');
                if (isAndroid) {
                  window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
                } else {
                  alert("Please tap the menu icon (...) in the top right corner and select 'Open in External Browser' or 'Open in System Browser'.");
                }
              }}
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold text-[13px] transition-colors"
            >
              Open in Chrome
            </button>
          </div>
        )}

        {/* Speed limit controls removed for production release */}
      </div>

      {/* TACTILE COCKPIT CONTROLS - GIANT TOUCH TARGETS */}
      <div className="flex flex-col gap-3" id="tactile_hud_actions">
        
        <div className="flex flex-col gap-3">
          {!isTracking ? (
              <button
                onClick={handleStartTracking}
                className={`w-full py-6 bg-green-500 active:scale-95 text-gray-900 rounded-[20px] font-black text-2xl tracking-wide shadow-lg border-b-[6px] border-green-700 text-center flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110`}
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
                className="py-5 bg-red-500 hover:bg-red-400 text-white rounded-[18px] font-black text-[18px] border-b-[5px] border-red-700 text-center flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all shadow-lg"
                id="btn_stop_tracking"
              >
                <Square className="w-6 h-6 fill-current mb-0.5" />
                <span>FINISH RIDE</span>
              </button>

              {/* Cancel Button */}
              <button
                onClick={handleCancelTracking}
                className="py-5 bg-gray-700 hover:bg-gray-600 text-white border-b-[5px] border-gray-900 rounded-[18px] font-black text-center flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 text-[18px] transition-all shadow-lg"
                id="btn_reset_tracking"
              >
                <RefreshCw className="w-6 h-6 text-gray-400 mb-0.5" />
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
        <div className="fixed inset-0 bg-gray-900/95 backdrop-blur-sm z-55 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-[20px] p-6 max-w-md w-full shadow-2xl border border-white/10 space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <h3 className="text-[18px] font-black text-white uppercase tracking-wider flex items-center gap-2">
                <activeProfile.icon className={`w-6 h-6 text-green-400`} /> Save Details
              </h3>
              <span className={`text-[12px] px-2.5 py-1 rounded bg-green-500/20 text-green-400 font-black uppercase`}>
                {activeProfile.name}
              </span>
            </div>

            <form onSubmit={handleSaveRide} className="space-y-4">
              {/* Dynamic Ride Category */}
              {activeProfile.showRideCategory && (
                <div className="space-y-1">
                  <label className="block text-[13px] font-black text-gray-400 uppercase tracking-wider">
                    {activeProfile.categoryLabel}
                  </label>
                  <select
                    value={rideCategory}
                    onChange={(e) => setRideCategory(e.target.value)}
                    className="w-full rounded-[14px] bg-gray-900 border border-white/10 p-4 text-[15px] text-white focus:outline-none cursor-pointer"
                  >
                    {activeProfile.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Distance Recap */}
              <div className="grid grid-cols-2 gap-3 bg-gray-700 p-4 rounded-[14px] border border-white/5 text-center">
                <div>
                  <span className="text-[12px] font-black text-gray-400 uppercase tracking-wider">{activeProfile.showDeadKm ? 'Earning KM' : 'Distance'}</span>
                  <p className="text-[22px] font-black text-white">{distanceKm.toFixed(2)} km</p>
                </div>
                {activeProfile.showDeadKm && (
                  <div>
                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-wider">Non-Earning KM</span>
                    <p className="text-[22px] font-black text-blue-400">{deadKm.toFixed(2)} km</p>
                  </div>
                )}
              </div>

              {/* Earnings Input / Profile Specific Block */}
              <div className="space-y-1">
                <label className="block text-[13px] font-black text-gray-400 uppercase tracking-wider">
                  Money you got for this Ride ({currency})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-black text-2xl">{currency}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    disabled={!activeProfile.showEarnings}
                    value={!activeProfile.showEarnings ? '0' : finalEarnings}
                    onChange={(e) => setFinalEarnings(e.target.value)}
                    className={`pl-12 block w-full rounded-[14px] bg-gray-900 border border-white/10 p-4 text-white text-[28px] font-black font-mono focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder="0.00"
                    autoFocus={activeProfile.showEarnings}
                  />
                </div>
                {!activeProfile.showEarnings ? (
                  <p className={`text-[13px] text-gray-400 font-bold`}>
                    Personal Trip. No commercial earnings.
                  </p>
                ) : (
                  <p className="text-[13px] text-gray-400 font-bold mt-1">
                    Fuel cost was: {currency}{estimatedFuelCost.toFixed(2)}
                  </p>
                )}
              </div>

              {/* Dynamic Fields generated strictly from Ride Profile Config */}
              {activeProfile.dynamicFields.length > 0 && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {activeProfile.dynamicFields.map(field => (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-[12px] font-black text-gray-400 uppercase tracking-wider">
                        {field.label} {field.type === 'currency' ? `(${currency})` : ''}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={dynamicFields[field.id] || ''}
                          onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="block w-full rounded-[14px] bg-gray-900 border border-white/10 p-3 text-[14px] text-white focus:outline-none cursor-pointer"
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
                            className="block w-full rounded-[14px] bg-gray-900 border border-white/10 p-3 text-[14px] text-white focus:outline-none"
                          />
                          {field.suffix && (
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                              <span className="text-[11px] text-gray-500 font-black uppercase">{field.suffix}</span>
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
                <label className="block text-[13px] font-black text-gray-400 uppercase tracking-wider">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={rideNotes}
                  onChange={(e) => setRideNotes(e.target.value)}
                  className="block w-full rounded-[14px] bg-gray-900 border border-white/10 p-4 text-[14px] text-white focus:outline-none"
                  placeholder="e.g. Heavy rain / Traffic delay"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { triggerClick(); setShowEndModal(false); }}
                  className="flex-1 py-4 bg-gray-700 text-white rounded-[14px] font-black text-[14px] uppercase cursor-pointer hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-4 bg-green-500 text-gray-900 rounded-[14px] font-black text-[14px] cursor-pointer flex items-center justify-center gap-2 uppercase hover:brightness-110 transition-colors shadow-md`}
                >
                  <Check className="w-5 h-5 text-gray-900 stroke-[3]" /> Save Ride
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
