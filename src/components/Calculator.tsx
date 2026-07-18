import React, { useState, useMemo, useEffect } from 'react';
import { VehicleConfig } from '../types';
import { RIDE_PROFILES } from '../config/rideProfiles';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Flame, 
  Sliders, 
  CheckCircle2, 
  AlertOctagon,
  Gauge,
  Settings,
  ChevronDown,
  ChevronUp,
  MapPin
} from 'lucide-react';

interface CalculatorProps {
  vehicle: VehicleConfig;
  currency: string;
}

export default function Calculator({ vehicle, currency }: CalculatorProps) {
  const [platform] = useState<string>(() => {
    return localStorage.getItem('rideprofit_active_platform') || 'Cab Ride';
  });

  const activeProfile = RIDE_PROFILES[platform] || RIDE_PROFILES['Cab Ride'];

  // Input parameters for quick calculation
  const [distance, setDistance] = useState<number>(8); // 8 km offer
  const [proposedFare, setProposedFare] = useState<number>(150); // 150 currency
  const [pickupDistance, setPickupDistance] = useState<number>(2); // 2 km pickup
  
  // Advanced Settings with defaults from profile
  const [platformFee, setPlatformFee] = useState<number>(activeProfile.commissionPercentage);
  const [maintenanceCostPerKm, setMaintenanceCostPerKm] = useState<number>(activeProfile.serviceCostPerKm);
  const [targetMargin, setTargetMargin] = useState<number>(activeProfile.targetProfitMargin);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Sync when platform profile changes (if component stays mounted)
  useEffect(() => {
    setPlatformFee(activeProfile.commissionPercentage);
    setMaintenanceCostPerKm(activeProfile.serviceCostPerKm);
    setTargetMargin(activeProfile.targetProfitMargin);
  }, [activeProfile.commissionPercentage, activeProfile.serviceCostPerKm, activeProfile.targetProfitMargin]);

  const triggerClick = () => {
    feedbackAudio.playClickSound();
    triggerHapticFeedback(30);
  };

  const handleGPS = () => {
    triggerClick();
    setGpsLoading(true);
    // Simulate GPS location finding
    setTimeout(() => {
      setPickupDistance(2.5); // Mocked realistic distance
      setGpsLoading(false);
    }, 800);
  };

  // Live Math engine
  const diagnostics = useMemo(() => {
    const totalDistWithDead = distance + pickupDistance;

    // Fuel cost calculations
    const fuelUsed = totalDistWithDead / (vehicle.mileage || 1);
    const fuelCost = fuelUsed * vehicle.fuelPrice;

    // Platform share / Commission
    const commissionCost = proposedFare * (platformFee / 100);

    // Depreciation & Maintenance cost
    const vehicleWearCost = totalDistWithDead * maintenanceCostPerKm;

    // Total expenses incurred
    const totalExpenses = fuelCost + commissionCost + vehicleWearCost;

    // Driver final profit
    const netEarnings = proposedFare - totalExpenses;
    
    // Efficiency ratios
    const marginPercent = proposedFare > 0 ? (netEarnings / proposedFare) * 100 : 0;
    const profitPerKm = distance > 0 ? netEarnings / distance : 0;

    // Minimum breakeven rates
    const costPerKmBase = ((vehicle.fuelPrice / (vehicle.mileage || 1)) + maintenanceCostPerKm) * (totalDistWithDead / (distance || 1));
    const minFarePerKmWithPlatform = costPerKmBase / (1 - platformFee / 100);
    const breakevenMinimumFare = minFarePerKmWithPlatform * distance;
    
    // Suggested Fare using Target Profit Margin
    let combinedCut = (targetMargin / 100) + (platformFee / 100);
    if (combinedCut >= 1) combinedCut = 0.95; // prevent division by zero or negative
    
    const suggestedProfitableMinimumFare = (fuelCost + vehicleWearCost) / (1 - combinedCut);

    // Calculate Verdict Category
    let verdictTitle = 'Loss! Do NOT Take.';
    let verdictDesc = 'After paying fuel, app commission, and wear, you will lose money on this ride. Better to reject it!';
    let verdictColor = 'bg-red-500/5 border-red-500/35 text-red-200';
    let badgeColor = 'bg-red-650 text-white';
    let icon = <AlertOctagon className="w-8 h-8 text-red-550 shrink-0" />;

    if (netEarnings > 0 && marginPercent >= targetMargin) {
      verdictTitle = 'Good Offer! Take it.';
      verdictDesc = `This is a very profitable ride! You will keep more than ${targetMargin}% of the fare. Accept it quickly!`;
      verdictColor = 'bg-green-500/5 border-green-500/35 text-green-200';
      badgeColor = 'bg-green-500 text-black';
      icon = <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />;
    } else if (netEarnings > 0 && marginPercent > 0) {
      verdictTitle = 'Low Profit! Think before taking.';
      verdictDesc = 'This ride pays for fuel and basic service costs, but leaves very little profit for you. Take it only if you want to go in this direction.';
      verdictColor = 'bg-amber-500/5 border-amber-500/35 text-amber-200';
      badgeColor = 'bg-amber-500 text-black';
      icon = <Gauge className="w-8 h-8 text-amber-400 shrink-0" />;
    }

    return {
      totalDistWithDead,
      fuelUsed,
      fuelCost,
      commissionCost,
      vehicleWearCost,
      totalExpenses,
      netEarnings,
      marginPercent,
      profitPerKm,
      breakevenMinimumFare,
      suggestedProfitableMinimumFare,
      verdictTitle,
      verdictDesc,
      verdictColor,
      badgeColor,
      icon
    };
  }, [distance, pickupDistance, proposedFare, platformFee, maintenanceCostPerKm, targetMargin, vehicle]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2" id="fare_profit_calculator">
      
      {/* Parameters Panel */}
      <div className="lg:col-span-6 p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-5" id="quick_offer_settings">
        <div>
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
            <Sliders className="w-5 h-5 text-green-400" /> Smart Profit Checker
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Check if a ride offer is profitable or a loss before accepting</p>
        </div>

        <div className="space-y-4">
          {/* Slider 1: Customer KM */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
              <span>Ride Distance (KM)</span>
              <span className="bg-zinc-900 border border-zinc-800 py-1 px-2.5 rounded text-white font-mono">{distance} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={distance}
              onChange={(e) => { triggerClick(); setDistance(Number(e.target.value)); }}
              className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Slider 2: Proposed Fare */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
              <span>Offered Fare</span>
              <div className="flex items-center gap-1">
                <span className="text-zinc-550 text-xs font-bold">{currency}</span>
                <input
                  type="number"
                  value={proposedFare}
                  onChange={(e) => { triggerClick(); setProposedFare(Number(e.target.value)); }}
                  className="w-20 p-1 bg-black border border-zinc-900 text-right rounded font-mono font-black text-white text-xs"
                />
              </div>
            </div>
            <input
              type="range"
              min="5"
              max="3000"
              step="5"
              value={proposedFare}
              onChange={(e) => { triggerClick(); setProposedFare(Number(e.target.value)); }}
              className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Slider 3: KM to Customer (Pickup) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
              <span>Pickup Distance (KM)</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleGPS}
                  className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 py-1 px-2 rounded hover:bg-blue-500/20 transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  {gpsLoading ? 'Locating...' : 'Use GPS'}
                </button>
                <span className="bg-zinc-900 border border-zinc-800 py-1 px-2.5 rounded text-amber-500 font-mono font-bold">{pickupDistance} km</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={pickupDistance}
              onChange={(e) => { triggerClick(); setPickupDistance(Number(e.target.value)); }}
              className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Advanced Settings Toggle */}
          <div className="pt-2">
            <button 
              onClick={() => { triggerClick(); setShowAdvanced(!showAdvanced); }}
              className="w-full flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-black text-zinc-300 uppercase tracking-wide hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-400" />
                Advanced Settings
              </div>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Advanced Settings Content */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg mt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
                  <span>App Commission (%)</span>
                  <span className="bg-black border border-zinc-800 py-1 px-2.5 rounded text-white font-mono">{platformFee}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={platformFee}
                  onChange={(e) => { triggerClick(); setPlatformFee(Number(e.target.value)); }}
                  className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
                  <span>Service Cost Per KM</span>
                  <span className="bg-black border border-zinc-800 py-1 px-2.5 rounded text-white font-mono">{currency}{maintenanceCostPerKm}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={maintenanceCostPerKm}
                  onChange={(e) => { triggerClick(); setMaintenanceCostPerKm(Number(e.target.value)); }}
                  className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
                  <span>Target Profit Margin</span>
                  <span className="bg-black border border-zinc-800 py-1 px-2.5 rounded text-white font-mono">{targetMargin}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={targetMargin}
                  onChange={(e) => { triggerClick(); setTargetMargin(Number(e.target.value)); }}
                  className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics / Verdict Panel */}
      <div className="lg:col-span-6 space-y-4 flex flex-col justify-between" id="quick_offer_diagnostics_results">
        
        {/* Dynamic Verdict banner */}
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${diagnostics.verdictColor}`} id="calc_verdict_pill">
          {diagnostics.icon}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black uppercase tracking-wide">{diagnostics.verdictTitle}</h4>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono ${diagnostics.badgeColor}`}>
                {diagnostics.marginPercent.toFixed(0)}% Margin
              </span>
            </div>
            <p className="text-xs opacity-90 mt-1 leading-normal text-zinc-300">{diagnostics.verdictDesc}</p>
          </div>
        </div>

        {/* Expenses and Take Home Breakdown card */}
        <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl shadow-sm flex-1 flex flex-col justify-between" id="calc_financial_card">
          <div className="space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-zinc-900">
              <div>
                <span className="text-xs font-black text-zinc-500 uppercase">Your Profit (Clear Money)</span>
                <span className={`text-3xl font-black font-mono block mt-1 ${diagnostics.netEarnings >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
                  {diagnostics.netEarnings >= 0 ? '+' : '-'}{currency}{Math.abs(diagnostics.netEarnings).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-zinc-500 uppercase block">Profit per KM</span>
                <span className="text-lg font-black font-mono text-green-400 block mt-1 glow-green">
                  {currency}{diagnostics.profitPerKm.toFixed(2)} / km
                </span>
              </div>
            </div>

            {/* Exp Detail Breakdown */}
            <div className="space-y-2 text-xs text-zinc-400 font-bold uppercase">
              <div className="flex justify-between">
                <span className="text-zinc-500">Ride Money (Gross Fare):</span>
                <span className="font-mono text-zinc-200 font-black">+{currency}{proposedFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-550">Fuel Cost ({diagnostics.totalDistWithDead.toFixed(1)} km):</span>
                <span className="font-mono text-red-400">-{currency}{diagnostics.fuelCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-550">App Cut Fee ({platformFee}%):</span>
                <span className="font-mono text-red-400">-{currency}{diagnostics.commissionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-550">Bike/Car Service Cost:</span>
                <span className="font-mono text-red-200">-{currency}{diagnostics.vehicleWearCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Pricing Threshold tips box */}
          <div className="bg-zinc-900/40 p-4 border border-zinc-900 rounded-xl mt-4">
            <h5 className="text-xs font-black text-zinc-300 uppercase mb-2 flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500" /> Minimum Price You Should Take
            </h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-bold">Absolute Minimum Price</span>
                <span className="font-mono text-zinc-200 font-black mt-0.5 block">{currency}{diagnostics.breakevenMinimumFare.toFixed(2)}</span>
                <p className="text-[9px] text-zinc-500 mt-1 leading-normal">Any price below this is a complete cash loss for you</p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 block uppercase font-bold">Suggested Fair Price</span>
                <span className="font-mono text-green-400 font-black mt-0.5 block glow-green">{currency}{diagnostics.suggestedProfitableMinimumFare.toFixed(2)}</span>
                <p className="text-[9px] text-zinc-550 mt-1 leading-normal">This rate guarantees you make {targetMargin}% clear profit</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
