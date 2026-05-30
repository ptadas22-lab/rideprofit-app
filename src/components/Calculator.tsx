import React, { useState, useMemo } from 'react';
import { VehicleConfig } from '../types';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Calculator as CalcIcon, 
  Percent, 
  Flame, 
  TrendingDown, 
  HelpCircle, 
  Sliders, 
  BadgeAlert, 
  CheckCircle2, 
  DollarSign,
  AlertOctagon,
  Gauge
} from 'lucide-react';

interface CalculatorProps {
  vehicle: VehicleConfig;
  currency: string;
}

export default function Calculator({ vehicle, currency }: CalculatorProps) {
  // Input parameters for quick calculation (e.g., offer verification)
  const [distance, setDistance] = useState<number>(8); // 8 km offer
  const [proposedFare, setProposedFare] = useState<number>(150); // 150 currency
  const [deadKmPercent, setDeadKmPercent] = useState<number>(20); // 20% dead km
  const [platformFee, setPlatformFee] = useState<number>(20); // 20% platform commission fee (Uber/Ola)
  const [maintenanceCostPerKm, setMaintenanceCostPerKm] = useState<number>(0.5); // 0.5 currency unit per km (wear & tear, tires, oil)

  const triggerClick = () => {
    feedbackAudio.playClickSound();
    triggerHapticFeedback(30);
  };

  // Live Math engine
  const diagnostics = useMemo(() => {
    const totalDistWithDead = distance * (1 + deadKmPercent / 100);
    const deadKmValue = distance * (deadKmPercent / 100);

    // Fuel cost calculations
    const fuelUsed = totalDistWithDead / (vehicle.mileage || 1);
    const fuelCost = fuelUsed * vehicle.fuelPrice;

    // Platform share / Commission
    const commissionCost = proposedFare * (platformFee / 100);

    // Depreciation & Maintenance cost (tires, oil, general wear)
    const vehicleWearCost = totalDistWithDead * maintenanceCostPerKm;

    // Total expenses incurred
    const totalExpenses = fuelCost + commissionCost + vehicleWearCost;

    // Driver final profit
    const netEarnings = proposedFare - totalExpenses;
    
    // Efficiency ratios
    const marginPercent = proposedFare > 0 ? (netEarnings / proposedFare) * 100 : 0;
    const profitPerKm = distance > 0 ? netEarnings / distance : 0;

    // Standard breakeven threshold calculations
    const fuelCostOnlyPerKm = (vehicle.fuelPrice / (vehicle.mileage || 1)) * (1 + deadKmPercent / 100);
    const wearCostPerKm = maintenanceCostPerKm * (1 + deadKmPercent / 100);
    const costPerKmBase = fuelCostOnlyPerKm + wearCostPerKm;
    
    // Minimum fare rate needed to cover variables + platform fee
    const minFarePerKmWithPlatform = costPerKmBase / (1 - platformFee / 100);
    const breakevenMinimumFare = minFarePerKmWithPlatform * distance;

    // Suggested minimum competitive commercial pricing (minimum 40% margin target)
    const suggestedProfitableMinimumFare = (costPerKmBase * 1.6) / (1 - platformFee / 100) * distance;

    // Calculate Verdict Category
    let verdict: 'HIGH_PROFIT' | 'BORDERLINE' | 'UNPROFITABLE' = 'UNPROFITABLE';
    let verdictTitle = 'Unprofitable Offer';
    let verdictDesc = 'Avoid accepting this ride. After accounting for platform commission, fuel burn, dead kilometers, and tires/oil depreciation, you are working at a complete loss!';
    let verdictColor = 'bg-red-500/5 border-red-500/25 text-red-200';
    let badgeColor = 'bg-red-500 text-zinc-950';
    let icon = <AlertOctagon className="w-8 h-8 text-red-400 shrink-0" />;

    if (netEarnings > 0 && marginPercent >= 40) {
      verdict = 'HIGH_PROFIT';
      verdictTitle = 'Highly Profitable Offer!';
      verdictDesc = 'Excellent ride offer! This deal yields a healthy profit margin above 40%. Recommended to accept immediately before it goes to another driver.';
      verdictColor = 'bg-green-500/5 border-green-500/25 text-green-200';
      badgeColor = 'bg-green-500 text-zinc-950';
      icon = <CheckCircle2 className="w-8 h-8 text-green-400 shrink-0" />;
    } else if (netEarnings > 0 && marginPercent > 0) {
      verdict = 'BORDERLINE';
      verdictTitle = 'Thin Margin Offer';
      verdictDesc = 'Accept with caution. This ride pays enough to cover fuel and basic wear, but leaves a very small wage margin. Best if it moves you towards high-demand zones.';
      verdictColor = 'bg-amber-500/5 border-amber-500/25 text-amber-200';
      badgeColor = 'bg-amber-500 text-zinc-950';
      icon = <Gauge className="w-8 h-8 text-amber-400 shrink-0" />;
    }

    return {
      totalDistWithDead,
      deadKmValue,
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
      verdict,
      verdictTitle,
      verdictDesc,
      verdictColor,
      badgeColor,
      icon
    };
  }, [distance, proposedFare, deadKmPercent, platformFee, maintenanceCostPerKm, vehicle]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2" id="fare_profit_calculator">
      
      {/* Parameters Panel */}
      <div className="lg:col-span-6 p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-6 animate-slideUp" id="quick_offer_settings">
        <div>
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            <Sliders className="w-5 h-5 text-green-400" /> Offer Profitability Check
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Instantly input of the proposed ride elements to diagnose profits
          </p>
        </div>

        <div className="space-y-4">
          {/* Slider 1: Ride Distance */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">Active Ride Distance</span>
              <span className="bg-zinc-800 border border-zinc-700/60 py-1 px-2 rounded font-mono text-zinc-100 font-bold">{distance} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={distance}
              onChange={(e) => { triggerClick(); setDistance(Number(e.target.value)); }}
              className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Slider 2: Proposed Fare */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">Proposed Fare</span>
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 text-xs font-bold">{currency}</span>
                <input
                  type="number"
                  value={proposedFare}
                  onChange={(e) => { triggerClick(); setProposedFare(Number(e.target.value)); }}
                  className="w-20 p-1 bg-zinc-950 border border-zinc-800 text-right rounded font-mono font-bold text-zinc-100 text-xs focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            <input
              type="range"
              min="5"
              max="5000"
              step="5"
              value={proposedFare}
              onChange={(e) => { triggerClick(); setProposedFare(Number(e.target.value)); }}
              className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Slider 3: Expected Dead KM Overhead % */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">Estimated Dead Km Overhead</span>
              <span className="bg-zinc-800 border border-zinc-700/60 py-1 px-2 rounded font-mono text-amber-450 font-bold">{deadKmPercent}% dead distance</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={deadKmPercent}
              onChange={(e) => { triggerClick(); setDeadKmPercent(Number(e.target.value)); }}
              className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
              Adds {diagnostics.deadKmValue.toFixed(1)} km unpaid cruising for pickup
            </p>
          </div>

          {/* Slider 4: Commission Fee */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">App Commission Fee</span>
              <span className="bg-zinc-800 border border-zinc-700/60 py-1 px-2 rounded font-mono text-zinc-100 font-bold">{platformFee}% platform cut</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={platformFee}
              onChange={(e) => { triggerClick(); setPlatformFee(Number(e.target.value)); }}
              className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Slider 5: Vehicle wear and tear cost */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">Vehicle wear & tear per KM</span>
              <span className="bg-zinc-800 border border-zinc-700/60 py-1 px-2 rounded font-mono text-zinc-100 font-bold">{currency}{maintenanceCostPerKm}/km</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={maintenanceCostPerKm}
              onChange={(e) => { triggerClick(); setMaintenanceCostPerKm(Number(e.target.value)); }}
              className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
              Covers oil, tire wear, general maintenance reserve
            </p>
          </div>
        </div>
      </div>

      {/* Diagnostics / Verdict Panel */}
      <div className="lg:col-span-6 space-y-6 flex flex-col justify-between" id="quick_offer_diagnostics_results">
        
        {/* Dynamic Verdict banner */}
        <div className={`p-5 rounded-xl border flex items-start gap-4 transition-all duration-200 ${diagnostics.verdictColor}`} id="calc_verdict_pill">
          {diagnostics.icon}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black uppercase tracking-wider">{diagnostics.verdictTitle}</h4>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${diagnostics.badgeColor}`}>
                {diagnostics.marginPercent.toFixed(0)}% Margin
              </span>
            </div>
            <p className="text-xs opacity-90 mt-1.5 leading-relaxed text-zinc-300">{diagnostics.verdictDesc}</p>
          </div>
        </div>

        {/* Expenses and Take Home Breakdown card */}
        <div className="p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-xl shadow-md flex-1 flex flex-col justify-between" id="calc_financial_card">
          <div className="space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-zinc-850">
              <div>
                <span className="text-[10px] font-bold text-zinc-505 uppercase tracking-widest">Driver Net Earnings</span>
                <span className={`text-2xl font-black font-mono block mt-0.5 ${diagnostics.netEarnings >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
                  {diagnostics.netEarnings >= 0 ? '+' : '-'}{currency}{Math.abs(diagnostics.netEarnings).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-zinc-505 uppercase tracking-widest block">Yield / active km</span>
                <span className="text-base font-bold font-mono text-green-400 block mt-0.5 glow-green">
                  {currency}{diagnostics.profitPerKm.toFixed(2)}/km
                </span>
              </div>
            </div>

            {/* Exp Detail Breakdown */}
            <div className="space-y-2.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span className="uppercase tracking-wider text-[10px] font-bold text-zinc-500">Proposed Gross Fare:</span>
                <span className="font-mono text-zinc-200 font-black">+{currency}{proposedFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="uppercase tracking-wider text-[10px] font-bold text-zinc-500">Fuel Cost ({diagnostics.totalDistWithDead.toFixed(1)} km total):</span>
                <span className="font-mono text-red-400 font-bold">-{currency}{diagnostics.fuelCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="uppercase tracking-wider text-[10px] font-bold text-zinc-500">App commission platform share ({platformFee}%):</span>
                <span className="font-mono text-red-400">-{currency}{diagnostics.commissionCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="uppercase tracking-wider text-[10px] font-bold text-zinc-500">Vehicle Wear & Tear ({maintenanceCostPerKm}/km):</span>
                <span className="font-mono text-red-200">-{currency}{diagnostics.vehicleWearCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Pricing Threshold tips box */}
          <div className="bg-zinc-950/80 p-4 border border-zinc-850 rounded-xl mt-6">
            <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2.5 flex items-center gap-1 font-black">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> Minimum Ride Threshold Rates
            </h5>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Absolute Breakeven Fare</span>
                <span className="font-mono text-zinc-200 font-extrabold mt-0.5 block">{currency}{diagnostics.breakevenMinimumFare.toFixed(2)}</span>
                <p className="text-[9px] text-zinc-650 mt-1 leading-normal">Below this, you operate at an active physical driving cash loss</p>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Recommended Yield Fare</span>
                <span className="font-mono text-green-400 font-black mt-0.5 block glow-green">{currency}{diagnostics.suggestedProfitableMinimumFare.toFixed(2)}</span>
                <p className="text-[9px] text-zinc-650 mt-1 leading-normal">Ensures standard 40%+ operational buffer margins</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
