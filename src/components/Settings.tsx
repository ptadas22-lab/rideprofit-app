import React, { useState } from 'react';
import { VehicleConfig, VehicleType, VEHICLE_PRESETS } from '../types';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Wrench, 
  Bike, 
  Car, 
  Zap, 
  Fuel, 
  TrendingUp, 
  Check, 
  Info, 
  DollarSign, 
  Sparkles,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface SettingsProps {
  vehicle: VehicleConfig;
  onVehicleChange: (v: VehicleConfig) => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
}

export default function Settings({ 
  vehicle, 
  onVehicleChange, 
  currency, 
  onCurrencyChange 
}: SettingsProps) {
  // Local form state
  const [mileage, setMileage] = useState<string>(vehicle.mileage.toString());
  const [fuelPrice, setFuelPrice] = useState<string>(vehicle.fuelPrice.toString());
  const [vehicleName, setVehicleName] = useState<string>(vehicle.name);
  const [vehicleType, setVehicleType] = useState<VehicleType>(vehicle.type);
  const [escRate, setEscRate] = useState<string>('0.05'); // default flat increase rate of 0.05 per session / day

  const triggerClick = () => {
    feedbackAudio.playClickSound();
    triggerHapticFeedback(45);
  };

  const triggerSuccess = () => {
    feedbackAudio.playStartSound();
    triggerHapticFeedback([100, 50, 100]);
  };

  // Preset Selection Click handler
  const handleSelectPreset = (type: VehicleType) => {
    triggerClick();
    const preset = VEHICLE_PRESETS[type];
    setVehicleType(type);
    setVehicleName(preset.name);
    setMileage(preset.mileage.toString());
    
    // Sensible base fuel price targets
    let price = 1.25; // standard dollar petrol
    if (type === 'bike') price = 1.20;
    if (type === 'auto') price = 0.90;
    if (type === 'car_diesel') price = 1.10;
    if (type === 'car_ev') price = 0.28; // standard kWh price
    
    setFuelPrice(price.toString());

    onVehicleChange({
      type,
      name: preset.name,
      mileage: preset.mileage,
      fuelUnit: preset.fuelUnit,
      fuelPrice: price
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSuccess();

    onVehicleChange({
      type: vehicleType,
      name: vehicleName.trim(),
      mileage: parseFloat(mileage) || 12.0,
      fuelUnit: vehicleType === 'car_ev' ? 'kWh' : 'Litre',
      fuelPrice: parseFloat(fuelPrice) || 1.20
    });

    alert('Vehicle and fuel configuration updated successfully!');
  };

  // Perform "gradual fuel price increase escalation simulation"
  const handleEscalatePrice = () => {
    triggerSuccess();
    const currentPrice = parseFloat(fuelPrice) || 1.0;
    const rate = parseFloat(escRate) || 0.05;
    const nextPrice = currentPrice + rate;
    
    setFuelPrice(nextPrice.toFixed(2));

    onVehicleChange({
      ...vehicle,
      fuelPrice: parseFloat(nextPrice.toFixed(2))
    });

    alert(`Escalated fuel price by +${rate} units. New price: ${currency}${nextPrice.toFixed(2)} per ${vehicle.fuelUnit}. Watch your minimum breakeven fare in the Calculator shift!`);
  };

  // Helper icons
  const getPresetIcon = (type: VehicleType) => {
    switch (type) {
      case 'bike':
        return <Bike className="w-5 h-5 text-current" />;
      case 'car_ev':
        return <Zap className="w-5 h-5 text-current" />;
      default:
        return <Car className="w-5 h-5 text-current" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2" id="settings_section">
      
      {/* Column A: Vehicle Presets Selection */}
      <div className="lg:col-span-4 p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-4" id="vehicle_catalog">
        <div>
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Select Vehicle</h3>
          <p className="text-xs text-zinc-400 mt-1">Preloads standard efficiency baselines</p>
        </div>

        <div className="space-y-2.5" id="presets_list">
          {(Object.keys(VEHICLE_PRESETS) as VehicleType[]).map((type) => {
            const preset = VEHICLE_PRESETS[type];
            const isSelected = vehicleType === type;

            return (
              <button
                key={type}
                onClick={() => handleSelectPreset(type)}
                className={`w-full p-3 rounded-lg border text-left flex items-start gap-3 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-green-500 bg-green-500/5 shadow-md shadow-green-500/5' 
                    : 'border-zinc-800 bg-zinc-950/20 hover:bg-zinc-900 hover:border-zinc-700/80'
                }`}
              >
                <div className={`p-2 rounded shrink-0 ${isSelected ? 'bg-green-500 text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>
                  {getPresetIcon(type)}
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-200 uppercase tracking-wide">{preset.name}</h4>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-wider">
                    Effic: {preset.mileage} KM/{preset.fuelUnit}
                  </p>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-green-400 ml-auto shrink-0 mt-2 stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Column B: Fuel and Custom Mileage configurator */}
      <div className="lg:col-span-8 space-y-6">
        <form onSubmit={handleSaveForm} className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-5" id="vehicle_customizer_form">
          <div>
            <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest">Fuel & Vehicle Configurator</h3>
            <p className="text-xs text-zinc-400 mt-1">Calibrate fuel metrics for high-precision profit logs</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Custom Name */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Vehicle Name / Model Label</label>
              <input
                type="text"
                required
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-zinc-200 focus:outline-none focus:border-green-500"
                placeholder="e.g. My Hero Splendor"
              />
            </div>

            {/* Currency Symbol Selection */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">System Currency Symbol</label>
              <select
                value={currency}
                onChange={(e) => { triggerClick(); onCurrencyChange(e.target.value); }}
                className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold text-zinc-200 focus:outline-none focus:border-green-500 cursor-pointer"
              >
                <option className="bg-zinc-900" value="₹">₹ - Indian Rupee (INR)</option>
                <option className="bg-zinc-900" value="$">$ - US Dollar (USD)</option>
                <option className="bg-zinc-900" value="€">€ - Euro (EUR)</option>
                <option className="bg-zinc-900" value="£ font-extrabold">£ - British Pound (GBP)</option>
                <option className="bg-zinc-900" value="₦">₦ - Nigerian Naira (NGN)</option>
                <option className="bg-zinc-900" value="₱">₱ - Philippine Peso (PHP)</option>
                <option className="bg-zinc-900" value="R$">R$ - Brazilian Real (BRL)</option>
              </select>
            </div>

            {/* Custom Mileage Input */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                Vehicle Mileage (KM / {vehicle.fuelUnit})
              </label>
              <input
                type="number"
                step="any"
                required
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold font-mono text-zinc-200 focus:outline-none focus:border-green-500"
                placeholder="Average mileage"
              />
              <p className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">
                Drives fuel expense deduction algorithms
              </p>
            </div>

            {/* Custom Fuel Price Point */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                Base Fuel Price (per {vehicle.fuelUnit})
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-zinc-500 font-bold text-xs">{currency}</span>
                </div>
                <input
                  type="number"
                  step="any"
                  required
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(e.target.value)}
                  className="pl-8 w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-bold font-mono text-zinc-200 focus:outline-none focus:border-green-500"
                  placeholder="Price"
                />
              </div>
              <p className="text-[10px] text-zinc-550 uppercase tracking-wider font-bold">
                Used for instant automatic route logs
              </p>
            </div>

          </div>

          <button
            type="submit"
            className="py-2.5 px-4 bg-green-500 hover:bg-green-400 text-zinc-950 border-b-2 border-green-700 rounded-lg text-xs font-black uppercase tracking-widest shadow-md shadow-green-500/10 cursor-pointer transition-all"
          >
            Apply Configurations
          </button>
        </form>

        {/* Gradual Fuel Price Escalator Simulation Section (Requirement 4) */}
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-100 space-y-4 shadow-lg" id="escalation_trainer">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 text-green-400 rounded-lg">
              <TrendingUp className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest flex items-center gap-1.5">
                Fuel Price Inflation Escalator <span className="text-[9px] bg-red-500/20 border border-red-500/20 text-red-400 font-black tracking-widest uppercase px-1.5 py-0.5 rounded">RIDER TOOL</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Simulate gradual fuel price trends and see how profit thresholds change</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-800/80 pt-4">
            <div className="col-span-2 space-y-2">
              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Escalate Fuel Price (Flat rate step increase)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={escRate}
                  onChange={(e) => setEscRate(e.target.value)}
                  className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-green-400 font-mono font-black w-24 focus:outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={handleEscalatePrice}
                  className="flex-1 py-2.5 bg-red-650 hover:bg-red-600 active:scale-98 text-white rounded-lg text-xs font-black uppercase tracking-widest border-b-2 border-red-800 cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  Trigger Escalation <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-850 flex flex-col justify-center text-center">
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Current Sim rate</span>
              <span className="text-lg font-black font-mono text-green-400 glow-green block mt-0.5">
                {currency}{parseFloat(fuelPrice).toFixed(2)}
              </span>
              <span className="text-[8px] text-zinc-550 font-black uppercase tracking-widest mt-0.5">per {vehicle.fuelUnit}</span>
            </div>
          </div>
          
          <div className="text-[10px] text-zinc-500 flex items-start gap-1.5 opacity-90 pt-1 leading-normal">
            <Info className="w-3.5 h-3.5 shrink-0 text-zinc-500 mt-0.5" />
            <p>Every trigger simulates gradual market fluctuations. Click to immediately model profit dynamics under steep oil rates on your dashboard, and verify your breakeven margins.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
