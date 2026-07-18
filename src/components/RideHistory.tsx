import React, { useState } from 'react';
import { Ride, VehicleConfig } from '../types';
import { formatDistance, formatDuration } from '../utils/geo';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { Plus, Trash2, Search, Clock, Calendar, X } from 'lucide-react';
import { RIDE_PROFILES } from '../config/rideProfiles';

interface RideHistoryProps {
  rides: Ride[];
  vehicle: VehicleConfig;
  currency: string;
  onRideLogged: (ride: Ride) => void;
  onRideDeleted: (id: string) => void;
  onClearAllRides: () => void;
}

export default function RideHistory({ 
  rides, 
  vehicle, 
  currency, 
  onRideLogged, 
  onRideDeleted, 
  onClearAllRides 
}: RideHistoryProps) {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'All' | Ride['platform']>('All');
  
  // Quick Log form toggles
  const [showQuickLogForm, setShowQuickLogForm] = useState(false);
  const [quickPlatform, setQuickPlatform] = useState<Ride['platform']>('Cab Ride');
  const [quickEarnings, setQuickEarnings] = useState('');
  const [quickDistance, setQuickDistance] = useState('');
  const [quickDeadKm, setQuickDeadKm] = useState('');
  const [quickDurationMins, setQuickDurationMins] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  
  // Dynamic Fields State
  const [quickCategory, setQuickCategory] = useState('');
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});

  // When quick platform changes, reset category and dynamic fields
  React.useEffect(() => {
    const profile = RIDE_PROFILES[quickPlatform];
    if (profile && profile.categories.length > 0) {
      setQuickCategory(profile.categories[0].id);
    } else {
      setQuickCategory('');
    }
    
    const defaultFields: Record<string, any> = {};
    if (profile && profile.dynamicFields) {
      profile.dynamicFields.forEach(f => {
        if (f.type === 'select' && f.options && f.options.length > 0) {
          defaultFields[f.id] = f.options[0];
        }
      });
    }
    setDynamicFields(defaultFields);
  }, [quickPlatform]);

  const triggerClick = () => {
    feedbackAudio.playClickSound();
    triggerHapticFeedback(40);
  };

  const triggerSuccess = () => {
    feedbackAudio.playStartSound();
    triggerHapticFeedback([80, 80]);
  };

  const handleQuickLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSuccess();

    const profile = RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Custom'];
    const earn = !profile.showEarnings ? 0 : (parseFloat(quickEarnings) || 0);
    const dist = parseFloat(quickDistance) || 0;
    const dead = parseFloat(quickDeadKm) || 0;
    const durationMins = parseFloat(quickDurationMins) || 15;

    const totalDist = dist + dead;
    const totalFuelUsed = totalDist / (vehicle.mileage || 1);
    const calculatedFuelCost = totalFuelUsed * vehicle.fuelPrice;
    const netProfit = earn - calculatedFuelCost;

    const newRide: Ride = {
      id: `ride_${Date.now()}`,
      platform: quickPlatform,
      startTime: new Date(Date.now() - durationMins * 60000).toISOString(),
      endTime: new Date().toISOString(),
      durationSeconds: Math.round(durationMins * 60),
      distanceKm: dist,
      deadKm: dead,
      earnings: earn,
      fuelPriceAtTime: vehicle.fuelPrice,
      mileageAtTime: vehicle.mileage,
      fuelCost: parseFloat(calculatedFuelCost.toFixed(2)),
      profit: parseFloat(netProfit.toFixed(2)),
      vehicleType: vehicle.type,
      notes: quickNotes.trim() || undefined,
      hasGPSPath: false,
      rideCategory: profile.showRideCategory ? quickCategory : undefined,
      dynamicFields: Object.keys(dynamicFields).length > 0 ? dynamicFields : undefined
    };

    onRideLogged(newRide);
    setShowQuickLogForm(false);
    
    // Reset Form
    setQuickEarnings('');
    setQuickDistance('');
    setQuickDeadKm('');
    setQuickDurationMins('');
    setQuickNotes('');
    setDynamicFields({});
  };

  // Filter rides
  const filteredRides = rides.filter(ride => {
    const searchString = `${ride.platform} ${ride.notes || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(search.toLowerCase());
    const matchesPlatform = platformFilter === 'All' || ride.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const handleDeleteRide = (id: string) => {
    triggerClick();
    if (window.confirm('Delete this ride record permanently?')) {
      onRideDeleted(id);
    }
  };

  const handleClearAll = () => {
    triggerClick();
    if (window.confirm('WARNING: Are you sure you want to delete ALL ride records? This cannot be undone!')) {
      onClearAllRides();
    }
  };

  // No longer using getPlatformColors since we have RIDE_PROFILES config

  return (
    <div className="space-y-4" id="history_ledger_section">
      {/* Header and Add Quick Ride Control */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-sm font-black text-zinc-150 uppercase tracking-wide">Past Rides Log</h3>
          <p className="text-xs text-zinc-500">List of your completed rides or log a ride manually below</p>
        </div>

        <button
          onClick={() => { triggerClick(); setShowQuickLogForm(!showQuickLogForm); }}
          className={`w-full sm:w-auto py-3 px-5 rounded-xl text-sm font-black uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
            showQuickLogForm 
              ? 'bg-zinc-900 text-zinc-400 border border-zinc-850' 
              : 'bg-green-500 text-black shadow-md border-b-4 border-green-700'
          }`}
          id="btn_open_quick_log"
        >
          {showQuickLogForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
          {showQuickLogForm ? 'Close manual logger' : 'Log a Past Ride'}
        </button>
      </div>

      {/* Manual Quick Entry Form Accent */}
      {showQuickLogForm && (
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4" id="quick_log_container">
          <h4 className="text-xs font-black uppercase text-green-400">Enter Ride details manually</h4>
          <form onSubmit={handleQuickLogSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            
            {/* Platform Selection */}
            <div className="md:col-span-3 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Ride Type</label>
              <select
                value={quickPlatform}
                onChange={(e) => setQuickPlatform(e.target.value as Ride['platform'])}
                className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black cursor-pointer"
              >
                {Object.values(RIDE_PROFILES).map(p => (
                  <option key={p.id} className="bg-zinc-950" value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Dynamic Ride Category */}
            {(() => {
              const profile = RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Custom'];
              return profile.showRideCategory ? (
                <div className="md:col-span-3 space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">{profile.categoryLabel}</label>
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black cursor-pointer"
                  >
                    {profile.categories.map(c => (
                      <option key={c.id} className="bg-zinc-950" value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              ) : <div className="md:col-span-3"></div>;
            })()}

            {/* Earnings */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Money Got ({currency})</label>
              <input
                type="number"
                step="any"
                required
                disabled={!(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showEarnings}
                placeholder="0.00"
                value={!(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showEarnings ? '0' : quickEarnings}
                onChange={(e) => setQuickEarnings(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {!(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showEarnings && (
                <p className="text-[9px] text-amber-500 font-bold mt-1">No commercial earnings.</p>
              )}
            </div>

            {/* Active Distance */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">{(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showDeadKm ? 'Earning KM' : 'Distance'}</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={quickDistance}
                onChange={(e) => setQuickDistance(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono"
              />
            </div>

            {/* Dead Distance */}
            {(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showDeadKm && (
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[10px] font-black text-zinc-400 uppercase">Non-Earning KM</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={quickDeadKm}
                  onChange={(e) => setQuickDeadKm(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono"
                />
              </div>
            )}

            {/* Duration */}
            <div className="md:col-span-3 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Time Taken (Minutes)</label>
              <input
                type="number"
                required
                placeholder="e.g. 25"
                value={quickDurationMins}
                onChange={(e) => setQuickDurationMins(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-12 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. High traffic / heavy rain"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black"
              />
            </div>

            {/* Dynamic Fields generated strictly from Ride Profile Config */}
            {(() => {
              const profile = RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Custom'];
              if (!profile.dynamicFields || profile.dynamicFields.length === 0) return null;
              
              return (
                <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-zinc-900">
                  {profile.dynamicFields.map(field => (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-[10px] font-black text-zinc-400 uppercase">
                        {field.label} {field.type === 'currency' ? `(${currency})` : ''}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={dynamicFields[field.id] || ''}
                          onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.id]: e.target.value }))}
                          className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black cursor-pointer"
                        >
                          {field.options?.map(opt => (
                            <option key={opt} className="bg-zinc-950" value={opt}>{opt}</option>
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
                            className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black"
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
              );
            })()}

            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-3 bg-green-500 text-black rounded-lg text-xs font-black uppercase cursor-pointer border-b-2 border-green-700"
              >
                Log Ride
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Filter and search parameters bar */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between" id="filter_options_ribbon">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search by app or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 w-full rounded-lg bg-black text-white placeholder-zinc-500 border border-zinc-900 text-xs font-black"
          />
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Quick Filter Selection */}
          {(['All', 'Cab Ride', 'Auto Ride', 'Bike Ride', 'Delivery Ride', 'Custom'] as const).map(f => (
            <button
              key={f}
              onClick={() => { triggerClick(); setPlatformFilter(f); }}
              className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase border cursor-pointer ${
                platformFilter === f
                  ? 'bg-green-500 border-green-500 text-black'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {f}
            </button>
          ))}

          {/* Delete All Ledger */}
          {rides.length > 0 && (
            <button
              onClick={handleClearAll}
              className="py-2 px-3 bg-red-950/20 text-red-400 rounded-lg text-[10px] font-black uppercase border border-red-500/20 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete All
            </button>
          )}
        </div>
      </div>

      {/* Primary History Ledger List */}
      <div className="space-y-3" id="ledger_list_items">
        {filteredRides.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-zinc-900 rounded-xl text-center bg-zinc-950 text-zinc-500">
            <Clock className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <h5 className="font-black text-xs uppercase text-zinc-400">No past rides found</h5>
            <p className="text-xs text-zinc-500 mt-1">Try changing filters or tap "Log a Past Ride" to start writing your details.</p>
          </div>
        ) : (
          filteredRides.slice().reverse().map((ride) => {
            const dateObj = new Date(ride.startTime);
            
            return (
              <div 
                key={ride.id}
                className="bg-zinc-950 rounded-xl border border-zinc-900 p-4 flex flex-col gap-4"
              >
                <div className="flex flex-col md:flex-row justify-between gap-4 w-full">
                {/* App & Notes */}
                <div className="flex gap-3 items-start shrink-0">
                  {(() => {
                    const profile = RIDE_PROFILES[ride.platform] || RIDE_PROFILES['Custom'];
                    const ProfileIcon = profile.icon;
                    return (
                      <div className={`py-1.5 px-3 rounded-lg border text-[10px] font-black uppercase flex items-center gap-1.5 ${profile.badgeClass}`}>
                        <ProfileIcon className="w-3 h-3" />
                        {ride.platform}
                      </div>
                    );
                  })()}
                  <div>
                    <h4 className="font-black text-zinc-200 text-xs uppercase flex items-center gap-1.5 flex-wrap">
                      Ride Done
                      {ride.notes && (
                        <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono font-bold">
                          {ride.notes}
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold uppercase tracking-wider mt-1">
                      <Calendar className="w-3.5 h-3.5 text-green-400" />
                      {dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Driving KPI Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-2xl px-0 md:px-4 text-xs font-black uppercase">
                  {/* Paid Distance */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-550 block">{(RIDE_PROFILES[ride.platform] || RIDE_PROFILES['Cab Ride']).showDeadKm ? 'Earning KM' : 'Distance'}</span>
                    <span className="text-sm font-black text-zinc-200 font-mono">
                      {formatDistance(ride.distanceKm)}
                    </span>
                  </div>

                  {/* Unpaid Dead distance */}
                  {(RIDE_PROFILES[ride.platform] || RIDE_PROFILES['Cab Ride']).showDeadKm && (
                    <div>
                      <span className="text-[10px] font-bold text-zinc-550 block">Non-Earning KM</span>
                      <span className={`text-sm font-black font-mono ${ride.deadKm > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
                        {ride.deadKm > 0 ? `${ride.deadKm.toFixed(2)} km` : '0.00 km'}
                      </span>
                    </div>
                  )}

                  {/* Travel duration and speed */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-550 block">Time Taken</span>
                    <span className="text-sm text-zinc-350 font-black font-mono">
                      {formatDuration(ride.durationSeconds)}
                    </span>
                  </div>

                  {/* Calculated fuel burned */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-550 block">Fuel Cost</span>
                    <span className="text-sm text-red-500 font-black font-mono">
                      {currency}{ride.fuelCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Ledger Financial Output */}
                <div className="flex md:flex-col justify-between items-end gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-900">
                  <div className="text-right">
                    <div className="flex items-center md:justify-end gap-1 text-[10px] text-zinc-550 font-black uppercase">
                      Fare: {currency}{ride.earnings.toFixed(2)}
                    </div>
                    <div className={`text-base font-black tracking-tight mt-0.5 ${ride.profit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
                      {ride.profit >= 0 ? '+' : '-'}{currency}{Math.abs(ride.profit).toFixed(2)}
                    </div>
                  </div>

                  {/* Delete individual ride button */}
                  <button
                    onClick={() => handleDeleteRide(ride.id)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/5 rounded-lg cursor-pointer"
                    title="Delete ride record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                </div>

                {/* Optional Dynamic Ride Extras Section */}
                {(() => {
                  const profile = RIDE_PROFILES[ride.platform] || RIDE_PROFILES['Custom'];
                  
                  if (!ride.rideCategory && (!ride.dynamicFields || Object.keys(ride.dynamicFields).length === 0)) return null;
                  
                  const categoryObj = profile.categories?.find(c => c.id === ride.rideCategory);
                  const displayLabel = categoryObj ? categoryObj.label : ride.rideCategory;

                  return (
                    <div className="border-t border-zinc-900 pt-3 mt-1 flex flex-col gap-2">
                      {ride.rideCategory && (
                        <div className="text-[10px] font-black uppercase text-zinc-500">
                          {profile.categoryLabel}: <span className={profile.accentClass}>{displayLabel}</span>
                        </div>
                      )}
                      
                      {ride.dynamicFields && Object.keys(ride.dynamicFields).length > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {Object.entries(ride.dynamicFields).map(([key, val]) => {
                            if (!val || val === 0) return null; // hide empty values
                            const fieldDef = profile.dynamicFields?.find(f => f.id === key);
                            const label = fieldDef?.label || key;
                            const prefix = fieldDef?.type === 'currency' ? currency : '';
                            const suffix = fieldDef?.suffix ? ` ${fieldDef.suffix}` : '';
                            
                            return (
                              <div key={key} className="text-xs font-black flex items-center gap-1.5 uppercase">
                                <span className="text-zinc-500">{label}</span>
                                <span className="text-zinc-200">
                                  {prefix}{val}{suffix}
                                </span>
                              </div>
                            );
                          })}
                          
                          {/* Personal Ride Specific Summary Overlays */}
                          {!profile.showEarnings && (
                            <div className="text-xs font-black flex items-center gap-1.5 uppercase">
                              <span className="text-zinc-500">Mileage</span>
                              <span className="text-purple-400">{ride.mileageAtTime} km/l</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
