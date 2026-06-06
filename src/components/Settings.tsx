import React, { useState } from 'react';
import { VehicleConfig, VehicleType, VEHICLE_PRESETS } from '../types';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Bike, 
  Car, 
  Zap, 
  Check, 
  Info, 
  TrendingUp,
  ArrowRight,
  AlertTriangle
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
  const [escRate, setEscRate] = useState<string>('5.00'); // default flat increase rate of 5.00 INR/units per step

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
    
    // Sensible base fuel price targets based on currency defaults
    let price = 95.00; // standard petrol in Rupees
    if (type === 'bike') price = 95.00;
    if (type === 'auto') price = 80.00;
    if (type === 'car_diesel') price = 88.00;
    if (type === 'car_ev') price = 10.00; // electric unit price
    
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
      mileage: parseFloat(mileage) || 15.0,
      fuelUnit: vehicleType === 'car_ev' ? 'kWh' : 'Litre',
      fuelPrice: parseFloat(fuelPrice) || 95.0
    });

    alert('Vehicle setup saved successfully!');
  };

  // Fuel price hike simulation
  const handleEscalatePrice = () => {
    triggerSuccess();
    const currentPrice = parseFloat(fuelPrice) || 95.0;
    const rate = parseFloat(escRate) || 5.0;
    const nextPrice = currentPrice + rate;
    
    setFuelPrice(nextPrice.toFixed(2));

    onVehicleChange({
      ...vehicle,
      fuelPrice: parseFloat(nextPrice.toFixed(2))
    });

    alert(`Fuel price increased by +${rate}. New fuel price: ${currency}${nextPrice.toFixed(2)} per ${vehicle.fuelUnit}. See how your clear profit decreases in the dashboard!`);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2" id="settings_section">
      
      {/* Column A: Vehicle Presets Selection */}
      <div className="lg:col-span-5 p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4" id="vehicle_catalog">
        <div>
          <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wide">Choose Your Vehicle</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Select your vehicle to set standard fuel mileage</p>
        </div>

        <div className="space-y-2" id="presets_list">
          {(Object.keys(VEHICLE_PRESETS) as VehicleType[]).map((type) => {
            const preset = VEHICLE_PRESETS[type];
            const isSelected = vehicleType === type;

            return (
              <button
                key={type}
                onClick={() => handleSelectPreset(type)}
                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-green-500 bg-green-500/5' 
                    : 'border-zinc-900 bg-black/40 hover:bg-zinc-900'
                }`}
              >
                <div className={`p-2 rounded shrink-0 ${isSelected ? 'bg-green-500 text-black animate-pulse' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>
                  {getPresetIcon(type)}
                </div>
                <div>
                  <h4 className="text-xs font-black text-zinc-200 uppercase">{preset.name}</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5 uppercase font-bold">
                    Standard Mileage: {preset.mileage} KM / {preset.fuelUnit}
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
      <div className="lg:col-span-7 space-y-4">
        <form onSubmit={handleSaveForm} className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4" id="vehicle_customizer_form">
          <div>
            <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wide">Mileage & Fuel Cost setup</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Enter details for high accuracy profit calculations</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Custom Name */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Vehicle Name</label>
              <input
                type="text"
                required
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold text-zinc-200 focus:outline-none focus:border-green-500"
                placeholder="e.g. My Hero Splendor"
              />
            </div>

            {/* Currency Symbol Selection */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">System Currency Symbol</label>
              <select
                value={currency}
                onChange={(e) => { triggerClick(); onCurrencyChange(e.target.value); }}
                className="w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold text-zinc-200 focus:outline-none focus:border-green-500 cursor-pointer"
              >
                <option className="bg-zinc-900" value="₹">₹ - Indian Rupee (INR)</option>
                <option className="bg-zinc-900" value="$">$ - US Dollar (USD)</option>
                <option className="bg-zinc-900" value="₦">₦ - Nigerian Naira (NGN)</option>
                <option className="bg-zinc-900" value="₱">₱ - Philippine Peso (PHP)</option>
                <option className="bg-zinc-900" value="R$">R$ - Brazilian Real (BRL)</option>
                <option className="bg-zinc-900" value="£">£ - British Pound (GBP)</option>
                <option className="bg-zinc-900" value="€">€ - Euro (EUR)</option>
              </select>
            </div>

            {/* Custom Mileage Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">
                KM per Litre (Mileage)
              </label>
              <input
                type="number"
                step="any"
                required
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold font-mono text-zinc-200 focus:outline-none"
                placeholder="Average mileage"
              />
              <p className="text-[9px] text-zinc-550 font-bold uppercase">
                How many KM does your bike/car run in 1 Litre
              </p>
            </div>

            {/* Custom Fuel Price Point */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">
                Fuel Price (per Litre)
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
                  className="pl-8 w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold font-mono text-zinc-200 focus:outline-none"
                  placeholder="Price"
                />
              </div>
              <p className="text-[9px] text-zinc-550 font-bold uppercase">
                Price of 1 Litre fuel in your area
              </p>
            </div>

          </div>

          <button
            type="submit"
            className="w-full py-3 bg-green-500 text-black border-b-4 border-green-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            Apply Configurations
          </button>
        </form>

        {/* Gradual Fuel Price Escalator Simulation Section */}
        <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-105 space-y-4 shadow-sm" id="escalation_trainer">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-green-500/10 text-green-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-zinc-100 uppercase flex items-center gap-1">
                Fuel Price Hike Tester
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Test how fuel price changes affect your daily clear profits</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-zinc-900 pt-3">
            <div className="col-span-2 space-y-2">
              <label className="block text-[10px] font-black text-zinc-500 uppercase">Increase price by</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="1.0"
                  value={escRate}
                  onChange={(e) => setEscRate(e.target.value)}
                  className="p-2.5 bg-black border border-zinc-900 rounded-lg text-xs text-green-400 font-mono font-black w-20"
                />
                <button
                  type="button"
                  onClick={handleEscalatePrice}
                  className="flex-1 py-2.5 bg-red-650 text-white rounded-lg text-xs font-black uppercase cursor-pointer transition-all flex items-center justify-center gap-1 border-b-2 border-red-800"
                >
                  Increase Fuel Price <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="bg-black p-3 rounded-lg border border-zinc-900 flex flex-col justify-center text-center">
              <span className="text-[10px] text-zinc-500 uppercase font-black">New Price</span>
              <span className="text-lg font-black font-mono text-green-400 glow-green block mt-0.5">
                {currency}{parseFloat(fuelPrice).toFixed(2)}
              </span>
              <span className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">per {vehicle.fuelUnit}</span>
            </div>
          </div>
          
          <div className="text-[10px] text-zinc-500 flex items-start gap-1.5 leading-normal">
            <Info className="w-4 h-4 shrink-0 text-zinc-650 mt-0.5" />
            <p>Every click increases the fuel price. Check "Today's Profit" and see how your Profit Per Hour drops!</p>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2 text-zinc-400">
          <h4 className="text-xs font-black uppercase text-green-400 flex items-center gap-1.5">
            🛡️ Privacy & Security Note
          </h4>
          <p className="text-xs leading-normal">
            Your ride data stays on your phone. RideProfit does not upload your location, earnings, or ride history.
          </p>
        </div>

        {/* Reset App Data */}
        <div className="p-4 bg-zinc-950 border border-red-955/20 rounded-xl space-y-3" id="reset_app_data_section">
          <div>
            <h4 className="text-xs font-black uppercase text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> Danger Zone
            </h4>
            <p className="text-[11px] text-zinc-500 mt-0.5">Delete all your stored rides, tracking sessions, and configuration values</p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerClick();
              if (window.confirm("Are you sure you want to delete all your ride data, history, and custom settings? This cannot be undone!")) {
                const keysToRemove = [
                  'rideprofit_rides_db',
                  'rideprofit_vehicle_db',
                  'rideprofit_currency',
                  'rideprofit_active_is_tracking',
                  'rideprofit_active_platform',
                  'rideprofit_active_duration_seconds',
                  'rideprofit_active_distance_km',
                  'rideprofit_active_dead_km',
                  'rideprofit_active_is_dead_km_mode',
                  'rideprofit_active_use_simulation',
                  'rideprofit_active_simulation_speed',
                  'rideprofit_active_gps_coordinates',
                  'rideprofit_active_show_end_modal',
                  'rideprofit_active_final_earnings',
                  'rideprofit_active_ride_notes',
                  'rideprofit_active_start_time'
                ];
                keysToRemove.forEach(k => {
                  try {
                    localStorage.removeItem(k);
                  } catch (e) {}
                });
                alert("All ride data has been cleared. Reloading...");
                window.location.reload();
              }
            }}
            className="w-full py-2.5 bg-red-950/20 text-red-400 border border-red-500/20 hover:bg-red-500/10 rounded-lg text-xs font-black uppercase cursor-pointer flex items-center justify-center gap-1"
          >
            Clear My Ride Data
          </button>
        </div>

      </div>

    </div>
  );
}
