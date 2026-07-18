import React, { useState, useMemo } from 'react';
import { VehicleConfig, VehicleType, VEHICLE_PRESETS, Ride, MaintenanceRecord, getDefaultMaintenanceRecords } from '../types';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { getEstimatedOdometer, getMaintenanceStatus, getTotalDistanceTracked } from '../utils/maintenance';
import { 
  Bike, 
  Car, 
  Zap, 
  Check, 
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus
} from 'lucide-react';

interface SettingsProps {
  rides: Ride[];
  vehicle: VehicleConfig;
  onVehicleChange: (v: VehicleConfig) => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
}

export default function Settings({ 
  rides,
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Odometer states
  const totalTrackedDistance = useMemo(() => getTotalDistanceTracked(rides), [rides]);
  const estimatedOdometer = (vehicle.baseOdometer || 0) + totalTrackedDistance;
  const [displayOdometer, setDisplayOdometer] = useState<string>(Math.round(estimatedOdometer).toString());
  const [personalKmInput, setPersonalKmInput] = useState<string>('');

  const [snoozedRecords, setSnoozedRecords] = useState<Set<string>>(new Set());

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
    let price = 95.00;
    if (type === 'bike') price = 95.00;
    if (type === 'auto') price = 80.00;
    if (type === 'car_diesel') price = 88.00;
    if (type === 'car_ev') price = 10.00;
    
    setFuelPrice(price.toString());
    setDisplayOdometer('0');

    onVehicleChange({
      type,
      name: preset.name,
      mileage: preset.mileage,
      fuelUnit: preset.fuelUnit,
      fuelPrice: price,
      baseOdometer: 0,
      lastOdometerUpdate: new Date().toISOString(),
      maintenanceRecords: getDefaultMaintenanceRecords(type, 0)
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSuccess();

    const newEstimatedOdo = parseFloat(displayOdometer) || 0;
    const newBaseOdo = newEstimatedOdo - totalTrackedDistance;

    onVehicleChange({
      ...vehicle,
      type: vehicleType,
      name: vehicleName.trim(),
      mileage: parseFloat(mileage) || 15.0,
      fuelUnit: vehicleType === 'car_ev' ? 'kWh' : 'Litre',
      fuelPrice: parseFloat(fuelPrice) || 95.0,
      baseOdometer: newBaseOdo,
      lastOdometerUpdate: new Date().toISOString(),
      maintenanceRecords: vehicle.maintenanceRecords || getDefaultMaintenanceRecords(vehicleType, newEstimatedOdo)
    });

    alert('Vehicle setup saved successfully!');
  };

  const handleAddPersonalKm = () => {
    const kmToAdd = parseFloat(personalKmInput);
    if (!kmToAdd || kmToAdd <= 0) return;
    
    triggerClick();
    const newBase = (vehicle.baseOdometer || 0) + kmToAdd;
    
    onVehicleChange({
      ...vehicle,
      baseOdometer: newBase,
      lastOdometerUpdate: new Date().toISOString()
    });
    
    setPersonalKmInput('');
    setDisplayOdometer(Math.round(newBase + totalTrackedDistance).toString());
  };

  const handleServiceCompleted = (recordId: string) => {
    triggerSuccess();
    if (!vehicle.maintenanceRecords) return;
    
    const updatedRecords = vehicle.maintenanceRecords.map(r => {
      if (r.id === recordId) {
        return { ...r, lastServicedOdometer: estimatedOdometer };
      }
      return r;
    });

    onVehicleChange({
      ...vehicle,
      maintenanceRecords: updatedRecords
    });
    
    setSnoozedRecords(prev => {
      const next = new Set(prev);
      next.delete(recordId);
      return next;
    });
  };

  const handleSnooze = (recordId: string) => {
    triggerClick();
    setSnoozedRecords(prev => new Set(prev).add(recordId));
  };

  // Helper icons
  const getPresetIcon = (type: VehicleType) => {
    if (type === 'bike') return <Bike className="w-5 h-5 text-current" />;
    if (type === 'car_ev') return <Zap className="w-5 h-5 text-current" />;
    return <Car className="w-5 h-5 text-current" />;
  };

  const maintenanceStatuses = getMaintenanceStatus(vehicle, estimatedOdometer);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2" id="settings_section">
      
      {/* Column A: Vehicle Presets Selection */}
      <div className="lg:col-span-4 space-y-4">
        <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wide">Select Vehicle</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 uppercase font-bold">Applies smart defaults</p>
          </div>

          <div className="space-y-2" id="presets_list">
            {(Object.keys(VEHICLE_PRESETS) as VehicleType[]).map((type) => {
              const preset = VEHICLE_PRESETS[type];
              const isSelected = vehicleType === type;

              return (
                <button
                  key={type}
                  onClick={() => handleSelectPreset(type)}
                  className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer transition-all ${
                    isSelected ? 'border-green-500 bg-green-500/10' : 'border-zinc-900 bg-black hover:bg-zinc-900'
                  }`}
                >
                  <div className={`p-1.5 rounded shrink-0 ${isSelected ? 'bg-green-500 text-black' : 'bg-zinc-900 text-zinc-400'}`}>
                    {getPresetIcon(type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[11px] font-black text-zinc-200 uppercase">{preset.name}</h4>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-green-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Maintenance Reminders */}
        {maintenanceStatuses.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black text-zinc-400 uppercase px-2">Smart Reminders</h3>
            {maintenanceStatuses.map(({ record, status, remainingKm }) => {
              if (status === 'Good' || snoozedRecords.has(record.id)) return null;
              
              const isOverdue = status === 'Overdue';
              const colorClass = isOverdue ? 'bg-red-950/40 border-red-500/50' : 'bg-amber-950/40 border-amber-500/50';
              const textColor = isOverdue ? 'text-red-400' : 'text-amber-400';
              
              return (
                <div key={record.id} className={`p-4 rounded-xl border ${colorClass} space-y-3`}>
                  <div className="flex items-start gap-2">
                    <Wrench className={`w-4 h-4 mt-0.5 ${textColor}`} />
                    <div>
                      <h4 className={`text-xs font-black uppercase ${textColor}`}>{record.label}</h4>
                      <p className="text-[10px] text-zinc-300 font-bold mt-0.5">
                        {isOverdue 
                          ? `Overdue by ${Math.abs(remainingKm).toFixed(0)} KM` 
                          : `Due in ${remainingKm.toFixed(0)} KM`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleServiceCompleted(record.id)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded bg-black/40 border border-black/50 ${textColor} hover:bg-black/60 flex items-center justify-center gap-1`}>
                      <CheckCircle2 className="w-3 h-3" /> Completed
                    </button>
                    <button onClick={() => handleSnooze(record.id)} className="flex-1 py-2 text-[10px] font-black uppercase rounded bg-black/40 border border-black/50 text-zinc-400 hover:bg-black/60 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" /> Remind Later
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Show Good status if nothing is due */}
            {maintenanceStatuses.every(s => s.status === 'Good' || snoozedRecords.has(s.record.id)) && (
              <div className="p-4 bg-green-950/20 border border-green-500/20 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs font-black text-green-400 uppercase">All systems good</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column B: Basic Profile & Odometer */}
      <div className="lg:col-span-8 space-y-4">
        <form onSubmit={handleSaveForm} className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-5">
          <div>
            <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wide">Vehicle Profile</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Basic details for accurate tracking</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Vehicle Name</label>
              <input type="text" required value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} className="w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold text-zinc-200 focus:outline-none focus:border-green-500" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Currency</label>
              <select value={currency} onChange={(e) => { triggerClick(); onCurrencyChange(e.target.value); }} className="w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold text-zinc-200 cursor-pointer">
                <option value="₹">₹ - INR</option>
                <option value="$">$ - USD</option>
                <option value="£">£ - GBP</option>
                <option value="€">€ - EUR</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Mileage (KM per {vehicleType === 'car_ev' ? 'kWh' : 'Litre'})</label>
              <input type="number" step="any" required value={mileage} onChange={(e) => setMileage(e.target.value)} className="w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold font-mono text-zinc-200" />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Fuel Price (per {vehicleType === 'car_ev' ? 'kWh' : 'Litre'})</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-zinc-500 font-bold text-xs">{currency}</span>
                </div>
                <input type="number" step="any" required value={fuelPrice} onChange={(e) => setFuelPrice(e.target.value)} className="pl-8 w-full p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold font-mono text-zinc-200" />
              </div>
            </div>
            
            <div className="space-y-1.5 sm:col-span-2 pt-2 border-t border-zinc-900">
              <div className="flex justify-between items-end">
                <label className="block text-[10px] font-black text-zinc-400 uppercase">Current Odometer (KM)</label>
                {vehicle.lastOdometerUpdate && (
                  <span className="text-[9px] text-zinc-600 font-bold uppercase">
                    Updated: {new Date(vehicle.lastOdometerUpdate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <input 
                type="number" 
                required 
                value={displayOdometer} 
                onChange={(e) => setDisplayOdometer(e.target.value)} 
                className="w-full p-3 rounded-lg bg-black border border-zinc-900 text-lg font-black font-mono text-white focus:outline-none focus:border-green-500" 
              />
              <p className="text-[10px] text-zinc-500">Automatically tracks from your logged rides. You can manually correct this at any time.</p>
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-green-500 text-black border-b-4 border-green-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer">
            Save Profile
          </button>
        </form>

        {/* Personal KM Adjustment */}
        <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl space-y-3">
          <div>
            <h4 className="text-xs font-black uppercase text-zinc-300">Add Personal KM</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Drove outside the app? Add kilometers without logging a ride.</p>
          </div>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="+ KM"
              value={personalKmInput}
              onChange={e => setPersonalKmInput(e.target.value)}
              className="w-32 p-2.5 rounded-lg bg-black border border-zinc-900 text-xs font-bold font-mono text-zinc-200"
            />
            <button 
              onClick={handleAddPersonalKm}
              className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-black uppercase rounded-lg border border-zinc-800 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden">
          <button 
            onClick={() => { triggerClick(); setShowAdvanced(!showAdvanced); }}
            className="w-full p-4 flex justify-between items-center bg-black/20 hover:bg-zinc-900/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-black uppercase text-zinc-300">Advanced Settings</span>
            </div>
            {showAdvanced ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
          </button>
          
          {showAdvanced && (
            <div className="p-5 border-t border-zinc-900 space-y-6">
              
              {/* Intervals Form */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-3">Maintenance Intervals (KM)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {vehicle.maintenanceRecords?.map(record => {
                    if (record.isHidden) return null;
                    return (
                      <div key={record.id} className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-zinc-400">{record.label}</label>
                        <input 
                          type="number"
                          value={record.intervalKm}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const newRecords = vehicle.maintenanceRecords!.map(r => r.id === record.id ? { ...r, intervalKm: val } : r);
                            onVehicleChange({ ...vehicle, maintenanceRecords: newRecords });
                          }}
                          className="w-full p-2 rounded bg-black border border-zinc-900 text-xs font-mono font-bold text-zinc-300"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Future Stubs */}
              <div className="space-y-2 pt-4 border-t border-zinc-900">
                <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-3">Future Features (Coming Soon)</h4>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-zinc-900 rounded text-[9px] font-bold text-zinc-600 uppercase border border-zinc-800">Multiple Vehicles</span>
                  <span className="px-2 py-1 bg-zinc-900 rounded text-[9px] font-bold text-zinc-600 uppercase border border-zinc-800">Service History</span>
                  <span className="px-2 py-1 bg-zinc-900 rounded text-[9px] font-bold text-zinc-600 uppercase border border-zinc-800">AI Suggestions</span>
                </div>
              </div>

            </div>
          )}
        </div>
        
        {/* Reset App Data */}
        <div className="p-4 bg-zinc-950 border border-red-955/20 rounded-xl space-y-3 mt-8">
          <div>
            <h4 className="text-xs font-black uppercase text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" /> Danger Zone
            </h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">Delete all your stored rides, tracking sessions, and configuration values</p>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerClick();
              if (window.confirm("Are you sure you want to delete all your ride data, history, and custom settings? This cannot be undone!")) {
                const keysToRemove = [
                  'rideprofit_rides_db', 'rideprofit_vehicle_db', 'rideprofit_currency',
                  'rideprofit_active_is_tracking', 'rideprofit_active_platform',
                  'rideprofit_active_start_time'
                ];
                keysToRemove.forEach(k => {
                  try { localStorage.removeItem(k); } catch (e) {}
                });
                alert("All ride data has been cleared. Reloading...");
                window.location.reload();
              }
            }}
            className="w-full py-2 bg-red-950/20 text-red-400 border border-red-500/20 hover:bg-red-500/10 rounded-lg text-[10px] font-black uppercase cursor-pointer flex items-center justify-center gap-1"
          >
            Clear My App Data
          </button>
        </div>

      </div>
    </div>
  );
}
