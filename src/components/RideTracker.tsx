import React, { useState, useEffect, useRef } from 'react';
import { TrackingSession, VehicleConfig, Ride } from '../types';
import { calculateHaversineDistance, formatDistance, formatDuration } from '../utils/geo';
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
  const [isTracking, setIsTracking] = useState(false);
  const [platform, setPlatform] = useState<Ride['platform']>('Uber');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [deadKm, setDeadKm] = useState(0);
  
  // High contrast switches
  const [isDeadKmMode, setIsDeadKmMode] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(45); // 45 km/h
  
  // Real GPS feedback
  const [geoError, setGeoError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsCoordinates, setGpsCoordinates] = useState<Array<{lat: number, lng: number}>>([]);

  // End Ride Form
  const [showEndModal, setShowEndModal] = useState(false);
  const [finalEarnings, setFinalEarnings] = useState<string>('');
  const [rideNotes, setRideNotes] = useState<string>('');

  // Timers and Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevCoordsRef = useRef<{lat: number, lng: number} | null>(null);
  const startTimeRef = useRef<string | null>(null);

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

  // 1. Duration Tracker
  useEffect(() => {
    if (isTracking) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setDurationSeconds(prev => prev + 1);
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

  // 2. Real Geolocation Watcher
  useEffect(() => {
    if (isTracking && !useSimulation) {
      if ('geolocation' in navigator) {
        setGeoError(null);
        
        geoWatchIdRef.current = navigator.geolocation.watchPosition(
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

              // Filter out stationary jitter (if accuracy is low and movement is tiny)
              if (delta > 0.005 && accuracy < 40) {
                if (isDeadKmMode) {
                  setDeadKm(prev => prev + delta);
                } else {
                  setDistanceKm(prev => prev + delta);
                }
              } else if (delta > 0.002 && accuracy < 15) {
                // Highly accurate updates
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
    } else {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
        geoWatchIdRef.current = null;
      }
      prevCoordsRef.current = null;
      setGpsAccuracy(null);
    }

    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, [isTracking, useSimulation, isDeadKmMode]);

  // 3. Driver GPS Simulation Mode (For indoor testing and desktop frame browser verification)
  useEffect(() => {
    if (isTracking && useSimulation) {
      setGeoError(null);
      // Center of city simulation coordinates (e.g. San Francisco or Mumbai depending on context)
      // We will anchor to standard 12.9716, 77.5946 (Bangalore, ride-hailing hub for Ola/Rapido)
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
    startTimeRef.current = new Date().toISOString();
  };

  const handleStopTracking = () => {
    triggerStopSequence();
    setIsTracking(false);
    
    // Auto calculate suggested initial earning based on common pricing metrics (e.g., fuel costs * 3 + distance base fare)
    // to make driver experience frictionless
    const approxFares: Record<string, number> = { Uber: 16, Ola: 15, Rapido: 8, Yandex: 12, Custom: 10, Personal: 0 };
    const baseRate = approxFares[platform] || 10;
    const suggestedEarning = (distanceKm * baseRate) + (platform === 'Personal' ? 0 : 5);
    
    setFinalEarnings(suggestedEarning > 0 ? Math.round(suggestedEarning).toString() : '0');
    setRideNotes('');
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
    }
  };

  const handleSaveRide = (e: React.FormEvent) => {
    e.preventDefault();
    triggerStartSequence(); // Satisfying click

    const earningsVal = parseFloat(finalEarnings) || 0;
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
      hasGPSPath: gpsCoordinates.length > 0
    };

    onRideLogged(loggedRide);
    setShowEndModal(false);
    
    // Reset tracker counters
    setDurationSeconds(0);
    setDistanceKm(0);
    setDeadKm(0);
    setGpsCoordinates([]);
  };

  // Instant Profit estimation during live route!
  const estimatedFuelCost = ((distanceKm + deadKm) / (vehicle.mileage || 1)) * vehicle.fuelPrice;

  return (
    <div className="space-y-6" id="ride_tracker_cockpit">
      {/* Platform & Simulation Quick Settings Band */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 text-zinc-105 p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center shadow-md animate-slideUp" id="platform_control_row">
        <div>
          <label className="text-[10px] font-bold tracking-widest text-green-400 uppercase">Operating Platform</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5" id="platform_pills">
            {(['Uber', 'Ola', 'Rapido', 'Yandex', 'Custom', 'Personal'] as const).map((p) => (
              <button
                key={p}
                disabled={isTracking}
                onClick={() => { triggerClick(); setPlatform(p); }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all duration-150 ${
                  platform === p 
                    ? 'bg-green-500 text-zinc-950 shadow-[0_0_10px_rgba(34,197,94,0.25)] font-black scale-102' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-750 disabled:opacity-40 border border-zinc-700/50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* GPS Simulation Switch */}
        <div className="border-t sm:border-t-0 sm:border-l border-zinc-800 pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-green-400 animate-pulse" /> Mock GPS Drive
              </span>
              <p className="text-[10px] text-zinc-500">Enable to test GPS inside browser</p>
            </div>
            <button
              onClick={() => { triggerClick(); setUseSimulation(!useSimulation); }}
              className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-150 ${
                useSimulation ? 'bg-green-500' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`bg-zinc-100 w-5 h-5 rounded-full shadow transition-transform duration-150 ${
                  useSimulation ? 'translate-x-[24px]' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Main HUD (Heads-Up Display) Panel */}
      <div className="p-6 bg-zinc-900/30 text-zinc-100 rounded-xl border border-zinc-800/80 shadow-lg relative overflow-hidden" id="navigation_hud_display">
        {/* Glow vector backdrops */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>
        {isTracking && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 py-1 px-2.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md text-[9px] font-bold tracking-widest uppercase animate-pulse">
            <Activity className="w-3.5 h-3.5" /> LIVE TRACKING
          </div>
        )}

        {/* HUD Grid Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2" id="live_metrics_scrow">
          {/* Active Ride Distance */}
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <Navigation className="w-3.5 h-3.5 text-green-400" /> Active Distance
            </span>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-50 font-mono glow-green">
                {distanceKm.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">km</span>
            </div>
            <p className="text-[10px] text-zinc-500">Paid fare kilometers</p>
          </div>

          {/* Unpaid Dead Distance. Highly visible amber alert for cabbies */}
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <MapPinOff className="w-3.5 h-3.5 text-amber-500" /> Dead Distance
            </span>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-500 font-mono">
                {deadKm.toFixed(2)}
              </span>
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">km</span>
            </div>
            <p className="text-[10px] text-amber-500/70">Cruising without passenger</p>
          </div>

          {/* Travel Duration */}
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <Timer className="w-3.5 h-3.5 text-emerald-450" /> Timer Seconds
            </span>
            <div className="pt-1">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-zinc-200 block py-0.5">
                {formatDuration(durationSeconds)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">Log elapsed time</p>
          </div>

          {/* estimated fuel cost overlay */}
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <Compass className="w-3.5 h-3.5 text-red-400" /> Est Fuel Burned
            </span>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-red-400 font-mono">
                {currency}{estimatedFuelCost.toFixed(2)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">Based on {vehicle.mileage}km yield</p>
          </div>
        </div>

        {/* GPS Satellite Connectivity Bar */}
        <div className="border-t border-zinc-800/80 mt-6 pt-4 flex flex-wrap justify-between items-center gap-4 text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-ping' : 'bg-zinc-650'}`}></div>
            <span>
              {isTracking 
                ? (useSimulation ? `Simulated Speed: ${simulationSpeed} km/h` : `Real GPS: Satellite Active`) 
                : 'GPS receiver idle'}
            </span>
            {gpsAccuracy && (
              <span className="bg-zinc-800 px-2 py-0.5 rounded text-[9px] text-green-400 font-mono">
                ACCURACY: ±{gpsAccuracy.toFixed(0)}M
              </span>
            )}
          </div>

          {geoError && (
            <div className="flex items-center gap-1.5 bg-red-950/20 text-red-400 px-2.5 py-1 rounded-md border border-red-500/20 text-[9px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{geoError}</span>
            </div>
          )}
        </div>

        {/* Speed limit Controls inside simulation */}
        {isTracking && useSimulation && (
          <div className="mt-4 p-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl flex flex-wrap gap-2 items-center">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Sim Speed Control:</span>
            {[25, 45, 80].map(speed => (
              <button
                key={speed}
                onClick={() => { triggerClick(); setSimulationSpeed(speed); }}
                className={`py-1 px-3 text-[10px] font-bold rounded-md cursor-pointer transition-all ${
                  simulationSpeed === speed 
                    ? 'bg-green-500 text-zinc-950 font-black' 
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700/40'
                }`}
              >
                {speed === 25 ? '🏍️ 25km/h Auto' : speed === 45 ? '🚗 45km/h City' : '✈️ 80km/h Hwy'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic tactile controller panel (Super simple on-the-road buttons) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4" id="tactile_hud_actions">
        
        {/* ACTIVE DRIVING COCKPIT CONTROLS */}
        <div className="md:col-span-8 flex flex-col gap-4">
          {!isTracking ? (
            <button
              onClick={handleStartTracking}
              className="w-full py-6 md:py-8 bg-green-500 hover:bg-green-400 active:scale-98 text-zinc-950 rounded-xl font-black text-xl sm:text-2xl shadow-[0_0_20px_rgba(34,197,94,0.15)] border-b-6 border-green-700 text-center flex items-center justify-center gap-3 transition-all duration-150 cursor-pointer"
              id="btn_start_tracking"
            >
              <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
              START ACTIVE RIDE
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Red Stop Button */}
              <button
                onClick={handleStopTracking}
                className="py-6 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-base sm:text-lg shadow-md border-b-6 border-red-800 text-center flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-98"
                id="btn_stop_tracking"
              >
                <Square className="w-5 h-5 fill-current mb-0.5" />
                <span>STOP & LOG</span>
              </button>

              {/* Cancel Button */}
              <button
                onClick={handleCancelTracking}
                className="py-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 rounded-xl font-bold text-center flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 text-sm"
                id="btn_reset_tracking"
              >
                <RefreshCw className="w-4 h-4 text-zinc-400" />
                <span>CANCEL</span>
              </button>
            </div>
          )}
        </div>

        {/* ACTIVE CRUISE TACTILE TOGGLE (Dead KM Counter) */}
        <div className="md:col-span-4 flex items-stretch">
          <button
            disabled={!isTracking}
            onClick={() => {
              triggerClick();
              setIsDeadKmMode(!isDeadKmMode);
            }}
            className={`w-full p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
              !isTracking
                ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-40'
                : isDeadKmMode
                  ? 'bg-amber-500 border-amber-600 text-zinc-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-zinc-900/80 hover:bg-zinc-850 border-zinc-800 text-zinc-300 hover:text-zinc-100 cursor-pointer'
            }`}
            id="btn_dead_km_shunter"
          >
            {isDeadKmMode ? (
              <>
                <MapPinOff className="w-8 h-8 mb-1.5 text-zinc-950 animate-bounce" />
                <span className="text-xs uppercase tracking-wider font-black">CRUISING RECORDING</span>
                <span className="text-[10px] opacity-95">Accumulating Dead mileage...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-8 h-8 mb-1.5 text-green-400" />
                <span className="text-xs uppercase tracking-wider font-black">CLIENT BOARDED</span>
                <span className="text-[10px] text-zinc-500">Tap when passenger boards taxi</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* End Ride Dialog Modal popup - styled elegantly to allow safe entry of earnings immediately */}
      {showEndModal && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-55 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-xl p-6 max-w-md w-full shadow-2xl border border-zinc-800 space-y-5 animate-scaleIn">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-black text-zinc-50 uppercase tracking-widest flex items-center gap-2">
                <Car className="w-5 h-5 text-green-400" /> Finalize Ride Record
              </h3>
              <span className="text-[9px] bg-green-500/10 border border-green-500/25 text-green-400 px-2.5 py-1 rounded font-black uppercase tracking-wider">
                {platform} Ride
              </span>
            </div>

            <form onSubmit={handleSaveRide} className="space-y-4">
              {/* Core metrics recap banner */}
              <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-center">
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Paid Distance</span>
                  <p className="text-base font-bold text-zinc-200 mt-0.5">{distanceKm.toFixed(2)} km</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Dead Distance</span>
                  <p className="text-base font-bold text-amber-500 mt-0.5">{deadKm.toFixed(2)} km</p>
                </div>
              </div>

              {/* Earnings Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                  Earnings for this Ride ({currency})
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 font-bold text-base">{currency}</span>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={finalEarnings}
                    onChange={(e) => setFinalEarnings(e.target.value)}
                    className="pl-8 block w-full rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-zinc-50 text-lg font-bold font-mono focus:outline-none focus:border-green-500"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-zinc-500">
                  Estimated Fuel Expenses: {currency}{estimatedFuelCost.toFixed(2)}
                </p>
              </div>

              {/* Ride Notes */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                  Optional Notes (Traffic, Pickup region, etc.)
                </label>
                <input
                  type="text"
                  value={rideNotes}
                  onChange={(e) => setRideNotes(e.target.value)}
                  className="block w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500"
                  placeholder="e.g., Heavy traffic near IT Park"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { triggerClick(); setShowEndModal(false); }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-zinc-200 rounded-lg font-bold text-xs cursor-pointer uppercase tracking-wider"
                >
                  Discard Ride
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-green-500 hover:bg-green-400 text-zinc-950 rounded-lg font-extrabold text-xs shadow-md shadow-green-500/10 cursor-pointer flex items-center justify-center gap-1 uppercase tracking-wider"
                >
                  <Check className="w-4 h-4 text-zinc-950 stroke-[3]" /> Save Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
