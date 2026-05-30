import React, { useState, useMemo } from 'react';
import { VehicleConfig } from '../types';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Flame, 
  Sliders, 
  CheckCircle2, 
  AlertOctagon,
  Gauge
} from 'lucide-react';

interface CalculatorProps {
  vehicle: VehicleConfig;
  currency: string;
}

export default function Calculator({ vehicle, currency }: CalculatorProps) {
  // Input parameters for quick calculation
  const [distance, setDistance] = useState<number>(8); // 8 km offer
  const [proposedFare, setProposedFare] = useState<number>(150); // 150 currency
  const [deadKmPercent, setDeadKmPercent] = useState<number>(20); // 20% dead km
  const [platformFee, setPlatformFee] = useState<number>(20); // 20% platform commission fee
  const [maintenanceCostPerKm, setMaintenanceCostPerKm] = useState<number>(0.5); // 0.5 currency unit per km (wear & tear)

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
    const fuelCostOnlyPerKm = (vehicle.fuelPrice / (vehicle.mileage || 1)) * (1 + deadKmPercent / 100);
    const wearCostPerKm = maintenanceCostPerKm * (1 + deadKmPercent / 100);
    const costPerKmBase = fuelCostOnlyPerKm + wearCostPerKm;
    const minFarePerKmWithPlatform = costPerKmBase / (1 - platformFee / 100);
    const breakevenMinimumFare = minFarePerKmWithPlatform * distance;
    const suggestedProfitableMinimumFare = (costPerKmBase * 1.6) / (1 - platformFee / 100) * distance;

    // Calculate Verdict Category
    let verdictTitle = 'Loss! Do NOT Take.';
    let verdictDesc = 'After paying fuel, app commission, and wear, you will lose money on this ride. Better to reject it!';
    let verdictColor = 'bg-red-500/5 border-red-500/35 text-red-200';
    let badgeColor = 'bg-red-650 text-white';
    let icon = <AlertOctagon className="w-8 h-8 text-red-550 shrink-0" />;

    if (netEarnings > 0 && marginPercent >= 40) {
      verdictTitle = 'Good Offer! Take it.';
      verdictDesc = 'This is a very profitable ride! You will keep more than 40% of the fare. Accept it quickly!';
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
      verdictTitle,
      verdictDesc,
      verdictColor,
      badgeColor,
      icon
    };
  }, [distance, proposedFare, deadKmPercent, platformFee, maintenanceCostPerKm, vehicle]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2" id="fare_profit_calculator">
      
      {/* Parameters Panel */}
      <div className="lg:col-span-6 p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-5" id="quick_offer_settings">
        <div>
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
            <Sliders className="w-5 h-5 text-green-400" /> Offer Profit Checker
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">Check if a ride offer is profitable or a loss before accepting</p>
        </div>

        <div className="space-y-4">
          {/* Slider 1: Customer KM */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
              <span>Customer KM (Ride Distance)</span>
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
              <span>Money Offered (Fare Price)</span>
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
              <span>KM to Customer (Pickup)</span>
              <span className="bg-zinc-900 border border-zinc-800 py-1 px-2.5 rounded text-amber-500 font-mono font-bold">{deadKmPercent}% extra KM</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={deadKmPercent}
              onChange={(e) => { triggerClick(); setDeadKmPercent(Number(e.target.value)); }}
              className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <p className="text-[10px] text-zinc-500 font-bold uppercase">
              Adds {diagnostics.deadKmValue.toFixed(1)} km unpaid driving to reach customer
            </p>
          </div>

          {/* Slider 4: App Commission Cut */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
              <span>App Cut (Commission %)</span>
              <span className="bg-zinc-900 border border-zinc-800 py-1 px-2.5 rounded text-white font-mono">{platformFee}% cut</span>
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

          {/* Slider 5: Vehicle wear and tear cost */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-black text-zinc-400 uppercase">
              <span>Service Cost (Oil/Tire wear)</span>
              <span className="bg-zinc-900 border border-zinc-800 py-1 px-2.5 rounded text-white font-mono">{currency}{maintenanceCostPerKm} / km</span>
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
            <p className="text-[10px] text-zinc-500 font-bold uppercase">
              Covers tire wear, engine oil, and general bike/car service savings
            </p>
          </div>
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
                <p className="text-[9px] text-zinc-550 mt-1 leading-normal">This rate guarantees you make 40% clear profit</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
