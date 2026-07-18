import React, { useState, useMemo } from 'react';
import { VehicleConfig, VehicleType, VEHICLE_PRESETS, Ride, getDefaultMaintenanceRecords } from '../types';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { getEstimatedOdometer, getMaintenanceStatus, getTotalDistanceTracked } from '../utils/maintenance';
import { 
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Car,
  Zap,
  Bike
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
  const [vehicleName, setVehicleName] = useState<string>(vehicle.name);
  const [vehicleType, setVehicleType] = useState<VehicleType>(vehicle.type);
  const [mileage, setMileage] = useState<string>(vehicle.mileage.toString());
  const [fuelPrice, setFuelPrice] = useState<string>(vehicle.fuelPrice.toString());
  const [baseOdoStr, setBaseOdoStr] = useState<string>(vehicle.baseOdometer?.toString() || '0');
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [personalKmInput, setPersonalKmInput] = useState<string>('');
  const [snoozedRecords, setSnoozedRecords] = useState<Set<string>>(new Set());

  // Odometer calculations
  const totalTrackedDistance = useMemo(() => getTotalDistanceTracked(rides), [rides]);
  const estimatedOdometer = (vehicle.baseOdometer || 0) + totalTrackedDistance;

  const triggerClick = () => {
    feedbackAudio.playClickSound();
    triggerHapticFeedback(45);
  };

  const triggerSuccess = () => {
    feedbackAudio.playStartSound();
    triggerHapticFeedback([100, 50, 100]);
  };

  const handleVehicleTypeChange = (type: VehicleType) => {
    triggerClick();
    const preset = VEHICLE_PRESETS[type];
    setVehicleType(type);
    setVehicleName(preset.name);
    setMileage(preset.mileage.toString());
    
    let price = 95.00;
    if (type === 'bike') price = 95.00;
    if (type === 'auto') price = 80.00;
    if (type === 'car_diesel') price = 88.00;
    if (type === 'car_ev') price = 10.00;
    setFuelPrice(price.toString());
  };

  const handleSaveBasicProfile = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSuccess();

    const newBaseOdo = parseFloat(baseOdoStr) || 0;
    
    // Update base odometer so that estimated odometer = new base + total tracked
    // If they want to set estimated directly, they can use Personal KM. 
    // Here we let them reset the base odometer.

    onVehicleChange({
      ...vehicle,
      type: vehicleType,
      name: vehicleName.trim(),
      mileage: parseFloat(mileage) || 15.0,
      fuelUnit: vehicleType === 'car_ev' ? 'kWh' : 'Litre',
      fuelPrice: parseFloat(fuelPrice) || 95.0,
      baseOdometer: newBaseOdo,
      lastOdometerUpdate: new Date().toISOString(),
      maintenanceRecords: vehicle.maintenanceRecords || getDefaultMaintenanceRecords(vehicleType, newBaseOdo + totalTrackedDistance)
    });

    alert('Vehicle setup saved successfully!');
  };

  const handleAddPersonalKm = () => {
    const kmToAdd = parseFloat(personalKmInput);
    if (!kmToAdd || kmToAdd === 0) return;
    
    triggerClick();
    const currentBase = vehicle.baseOdometer || 0;
    const newBase = currentBase + kmToAdd;
    
    onVehicleChange({
      ...vehicle,
      baseOdometer: newBase,
      lastOdometerUpdate: new Date().toISOString()
    });
    
    setBaseOdoStr(newBase.toString());
    setPersonalKmInput('');
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

  const maintenanceStatuses = getMaintenanceStatus(vehicle, estimatedOdometer);

  return (
    <div className="space-y-6 mt-2 max-w-3xl mx-auto" id="settings_section">
      
      {/* 1. BASIC VEHICLE SETUP */}
      <div className="bg-gray-800 border border-white/10 rounded-[20px] overflow-hidden shadow-md">
        <div className="bg-gray-700/50 p-5 border-b border-white/10">
          <h3 className="text-[16px] font-black text-white uppercase tracking-wide">Basic Vehicle Setup</h3>
          <p className="text-[11px] text-gray-400 mt-1 font-bold uppercase">Core profile configuration</p>
        </div>
        
        <form onSubmit={handleSaveBasicProfile} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-300 uppercase">Vehicle Type</label>
              <select 
                value={vehicleType} 
                onChange={e => handleVehicleTypeChange(e.target.value as VehicleType)}
                className="w-full p-3.5 rounded-[12px] bg-gray-900 border border-white/10 text-[13px] font-bold text-white cursor-pointer focus:border-green-500"
              >
                {(Object.keys(VEHICLE_PRESETS) as VehicleType[]).map(t => (
                  <option key={t} value={t}>{VEHICLE_PRESETS[t].name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-300 uppercase">Vehicle Name</label>
              <input 
                type="text" 
                required 
                value={vehicleName} 
                onChange={(e) => setVehicleName(e.target.value)} 
                className="w-full p-3.5 rounded-[12px] bg-gray-900 border border-white/10 text-[13px] font-bold text-white focus:outline-none focus:border-green-500" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-300 uppercase">Fuel Type</label>
              <select 
                disabled
                value={vehicleType === 'car_ev' ? 'electric' : 'liquid'}
                className="w-full p-3.5 rounded-[12px] bg-gray-800/50 border border-white/5 text-[13px] font-bold text-gray-400 cursor-not-allowed"
              >
                <option value="liquid">Petrol / Diesel</option>
                <option value="electric">Electric (EV)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-300 uppercase">Currency Setup</label>
              <select 
                value={currency} 
                onChange={(e) => { triggerClick(); onCurrencyChange(e.target.value); }} 
                className="w-full p-3.5 rounded-[12px] bg-gray-900 border border-white/10 text-[13px] font-bold text-white cursor-pointer focus:border-green-500"
              >
                <option value="₹">₹ - INR</option>
                <option value="$">$ - USD</option>
                <option value="£">£ - GBP</option>
                <option value="€">€ - EUR</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-300 uppercase">Mileage (KM per {vehicleType === 'car_ev' ? 'kWh' : 'Litre'})</label>
              <input 
                type="number" 
                step="any" 
                required 
                value={mileage} 
                onChange={(e) => setMileage(e.target.value)} 
                className="w-full p-3.5 rounded-[12px] bg-gray-900 border border-white/10 text-[14px] font-bold font-mono text-white focus:border-green-500 focus:outline-none" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-300 uppercase">Fuel Price (per {vehicleType === 'car_ev' ? 'kWh' : 'Litre'})</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400 font-bold text-[14px]">{currency}</span>
                </div>
                <input 
                  type="number" 
                  step="any" 
                  required 
                  value={fuelPrice} 
                  onChange={(e) => setFuelPrice(e.target.value)} 
                  className="pl-10 w-full p-3.5 rounded-[12px] bg-gray-900 border border-white/10 text-[14px] font-bold font-mono text-white focus:border-green-500 focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-[11px] font-black text-gray-300 uppercase">Current Base Odometer (KM)</label>
              <input 
                type="number" 
                required 
                value={baseOdoStr} 
                onChange={(e) => setBaseOdoStr(e.target.value)} 
                className="w-full p-3.5 rounded-[12px] bg-gray-900 border border-white/10 text-[14px] font-bold font-mono text-white focus:border-green-500 focus:outline-none" 
              />
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                Your starting odometer reading before RideProfit tracking.
              </p>
            </div>

          </div>
          
          <button type="submit" className="w-full mt-4 py-4 bg-green-500 hover:brightness-110 transition-all text-gray-900 border-b-4 border-green-700 rounded-[14px] text-[13px] font-black uppercase tracking-wider cursor-pointer shadow-md">
            Save Basic Setup
          </button>
        </form>
      </div>

      {/* 2. ESTIMATED ODOMETER */}
      <div className="bg-gray-800 border border-white/10 rounded-[20px] overflow-hidden shadow-md">
        <div className="bg-gray-700/50 p-5 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-[16px] font-black text-white uppercase tracking-wide">Estimated Odometer</h3>
            <p className="text-[11px] text-gray-400 mt-1 font-bold uppercase">Dynamic distance tracking</p>
          </div>
          {vehicle.lastOdometerUpdate && (
            <div className="text-right">
              <span className="text-[10px] text-gray-500 font-black uppercase block">Last Updated</span>
              <span className="text-[11px] text-gray-300 font-bold">{new Date(vehicle.lastOdometerUpdate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            <div className="bg-gray-900 border border-white/10 p-4 rounded-[16px]">
              <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">Base Odometer</span>
              <span className="text-[16px] font-mono font-black text-gray-300">{Math.round(vehicle.baseOdometer || 0)} KM</span>
            </div>
            <div className="bg-gray-900 border border-white/10 p-4 rounded-[16px]">
              <span className="text-[10px] font-black text-gray-500 uppercase block mb-1">RideProfit Tracked</span>
              <span className="text-[16px] font-mono font-black text-blue-400">+{Math.round(totalTrackedDistance)} KM</span>
            </div>
            <div className="col-span-2 md:col-span-1 bg-green-500/10 border border-green-500/20 p-4 rounded-[16px] relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Clock className="w-16 h-16 text-green-400" />
              </div>
              <span className="text-[10px] font-black text-green-500 uppercase block mb-1">Estimated Odometer</span>
              <span className="text-[24px] font-mono font-black text-green-400 leading-none">{Math.round(estimatedOdometer)} KM</span>
            </div>
          </div>

          <div className="bg-gray-700/50 p-5 rounded-[16px] border border-white/5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h4 className="text-[13px] font-black uppercase text-gray-300">Personal KM Adjustment</h4>
                <p className="text-[11px] text-gray-500 mt-1">Add KM if you drove outside RideProfit (e.g. +35 KM)</p>
              </div>
              <div className="flex gap-2.5">
                <input 
                  type="number" 
                  placeholder="+ KM"
                  value={personalKmInput}
                  onChange={e => setPersonalKmInput(e.target.value)}
                  className="w-32 p-3 rounded-[12px] bg-gray-900 border border-white/10 text-[13px] font-bold font-mono text-white focus:outline-none focus:border-green-500"
                />
                <button 
                  onClick={handleAddPersonalKm}
                  className="py-3 px-5 bg-gray-600 hover:bg-gray-500 text-white text-[12px] font-black uppercase rounded-[12px] border border-white/10 flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SMART MAINTENANCE */}
      <div className="bg-gray-800 border border-white/10 rounded-[20px] overflow-hidden shadow-md">
        <div className="bg-gray-700/50 p-5 border-b border-white/10 flex justify-between items-center">
          <div>
            <h3 className="text-[16px] font-black text-white uppercase tracking-wide">Smart Maintenance</h3>
            <p className="text-[11px] text-gray-400 mt-1 font-bold uppercase">Automated service reminders</p>
          </div>
          <div className="w-10 h-10 bg-gray-900 border border-white/10 rounded-[12px] flex items-center justify-center">
            <Wrench className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        
        <div className="p-6">
          {maintenanceStatuses.length === 0 ? (
            <p className="text-[13px] text-gray-500">No active maintenance records. Save your profile to generate defaults.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {maintenanceStatuses.map(({ record, status, remainingKm }) => {
                const isOverdue = status === 'Overdue';
                const isDueSoon = status === 'Due Soon';
                const isGood = status === 'Good';
                const isSnoozed = snoozedRecords.has(record.id);
                
                let cardClass = 'bg-gray-900 border-white/10';
                let textClass = 'text-green-400';
                let displayStatus = 'Good';
                
                if (isOverdue && !isSnoozed) {
                  cardClass = 'bg-red-950/20 border-red-500/30';
                  textClass = 'text-red-400';
                  displayStatus = `Overdue by ${Math.abs(remainingKm).toFixed(0)} KM`;
                } else if (isDueSoon && !isSnoozed) {
                  cardClass = 'bg-amber-950/20 border-amber-500/30';
                  textClass = 'text-amber-400';
                  displayStatus = `Due in ${remainingKm.toFixed(0)} KM`;
                }

                return (
                  <div key={record.id} className={`p-5 rounded-[16px] border flex flex-col justify-between space-y-4 ${cardClass}`}>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-[13px] font-black uppercase text-white leading-tight">{record.label}</h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-[6px] border whitespace-nowrap ${
                        isGood || isSnoozed ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                        isOverdue ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                        'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {isSnoozed ? 'Good (Snoozed)' : displayStatus}
                      </span>
                    </div>
                    
                    {(!isGood && !isSnoozed) && (
                      <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
                        <button onClick={() => handleServiceCompleted(record.id)} className={`flex-1 py-3 text-[11px] font-black uppercase rounded-[10px] bg-gray-800 border border-white/10 ${textClass} hover:bg-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm`}>
                          <CheckCircle2 className="w-4 h-4" /> Completed
                        </button>
                        <button onClick={() => handleSnooze(record.id)} className="flex-1 py-3 text-[11px] font-black uppercase rounded-[10px] bg-gray-800 border border-white/10 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm">
                          <Clock className="w-4 h-4" /> Remind Later
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. ADVANCED SETTINGS */}
      <div className="bg-gray-800 border border-white/10 rounded-[20px] overflow-hidden shadow-md">
        <button 
          onClick={() => { triggerClick(); setShowAdvanced(!showAdvanced); }}
          className="w-full p-5 flex justify-between items-center bg-gray-700/50 hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-gray-400" />
            <span className="text-[14px] font-black uppercase text-white">Advanced Settings</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        
        {showAdvanced && (
          <div className="p-6 border-t border-white/10 space-y-8">
            
            {/* Maintenance Intervals */}
            <div>
              <h4 className="text-[12px] font-black uppercase text-gray-500 mb-4">Maintenance Intervals (KM)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicle.maintenanceRecords?.map(record => {
                  if (record.isHidden) return null;
                  return (
                    <div key={record.id} className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400">{record.label}</label>
                      <input 
                        type="number"
                        value={record.intervalKm}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const newRecords = vehicle.maintenanceRecords!.map(r => r.id === record.id ? { ...r, intervalKm: val } : r);
                          onVehicleChange({ ...vehicle, maintenanceRecords: newRecords });
                        }}
                        className="w-full p-3 rounded-[12px] bg-gray-900 border border-white/10 text-[13px] font-mono font-bold text-gray-300 focus:border-green-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notification Settings */}
            <div className="pt-6 border-t border-white/5">
              <h4 className="text-[12px] font-black uppercase text-gray-500 mb-4">Notification Preferences</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'maintenance', label: 'Maintenance Reminders' },
                  { id: 'profitAlerts', label: 'Profit Alerts' },
                  { id: 'rideInsights', label: 'Ride Insights' },
                  { id: 'vehicleDocuments', label: 'Vehicle Documents' },
                  { id: 'systemUpdates', label: 'System Updates' },
                  { id: 'pushNotifications', label: 'Push Notifications (Coming Soon)' }
                ].map(setting => {
                  const currentSettings = vehicle.notificationSettings || {
                    maintenance: true, profitAlerts: true, rideInsights: true,
                    vehicleDocuments: true, systemUpdates: true, pushNotifications: false
                  };
                  const isChecked = currentSettings[setting.id as keyof typeof currentSettings];
                  
                  return (
                    <label key={setting.id} className="flex items-center gap-3 cursor-pointer bg-gray-900 p-3.5 rounded-[12px] border border-white/10 hover:border-gray-600 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={!!isChecked}
                        disabled={setting.id === 'pushNotifications'}
                        onChange={(e) => {
                          const newSettings = { ...currentSettings, [setting.id]: e.target.checked };
                          onVehicleChange({ ...vehicle, notificationSettings: newSettings });
                        }}
                        className="w-5 h-5 rounded-[6px] bg-gray-800 border-white/20 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900 cursor-pointer disabled:opacity-50"
                      />
                      <span className={`text-[11px] font-black uppercase ${setting.id === 'pushNotifications' ? 'text-gray-600' : 'text-gray-300'}`}>
                        {setting.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6 border-t border-white/5">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase">Service Cost Per KM ({currency})</label>
                <input 
                  type="number" 
                  disabled 
                  value="1.50" 
                  className="w-full p-3 rounded-[12px] bg-gray-800/50 border border-white/5 text-[13px] font-mono font-bold text-gray-500 cursor-not-allowed" 
                />
                <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">Configured globally via Ride Profiles.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase">Reminder Distance (KM)</label>
                <input 
                  type="number" 
                  disabled 
                  value="500" 
                  className="w-full p-3 rounded-[12px] bg-gray-800/50 border border-white/5 text-[13px] font-mono font-bold text-gray-500 cursor-not-allowed" 
                />
                <p className="text-[10px] text-gray-600 font-bold uppercase mt-1">Warns when approaching due.</p>
              </div>
            </div>

            {/* Future Features */}
            <div className="space-y-3 pt-6 border-t border-white/5">
              <h4 className="text-[12px] font-black uppercase text-gray-500 mb-2">Future Features</h4>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2.5 py-1.5 bg-gray-900 rounded-[8px] text-[10px] font-bold text-gray-500 uppercase border border-white/10">Multiple Vehicles</span>
                <span className="px-2.5 py-1.5 bg-gray-900 rounded-[8px] text-[10px] font-bold text-gray-500 uppercase border border-white/10">Service History</span>
                <span className="px-2.5 py-1.5 bg-gray-900 rounded-[8px] text-[10px] font-bold text-gray-500 uppercase border border-white/10">AI Suggestions</span>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <h4 className="text-[13px] font-black uppercase text-red-400 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" /> Danger Zone
              </h4>
              <button
                type="button"
                onClick={() => {
                  triggerClick();
                  if (window.confirm("Are you sure you want to delete all your ride data, history, and custom settings? This cannot be undone!")) {
                    const keysToRemove = [
                      'rideprofit_rides_db', 'rideprofit_vehicle_db', 'rideprofit_currency'
                    ];
                    keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
                    alert("All ride data has been cleared. Reloading...");
                    window.location.reload();
                  }
                }}
                className="w-full sm:w-auto py-3.5 px-8 bg-red-950/30 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-[14px] text-[11px] font-black uppercase cursor-pointer transition-colors"
              >
                Clear My App Data
              </button>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
