import React, { useState } from 'react';
import { Ride, VehicleConfig } from '../types';
import { formatDistance, formatDuration } from '../utils/geo';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Plus, 
  Trash2, 
  Search, 
  FileSpreadsheet, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Car, 
  MapPinOff, 
  CornerDownRight, 
  Info,
  Calendar,
  X
} from 'lucide-react';

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
  const [quickPlatform, setQuickPlatform] = useState<Ride['platform']>('Uber');
  const [quickEarnings, setQuickEarnings] = useState('');
  const [quickDistance, setQuickDistance] = useState('');
  const [quickDeadKm, setQuickDeadKm] = useState('');
  const [quickDurationMins, setQuickDurationMins] = useState('');
  const [quickNotes, setQuickNotes] = useState('');

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

    const earn = parseFloat(quickEarnings) || 0;
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
      hasGPSPath: false
    };

    onRideLogged(newRide);
    setShowQuickLogForm(false);
    
    // Reset Form
    setQuickEarnings('');
    setQuickDistance('');
    setQuickDeadKm('');
    setQuickDurationMins('');
    setQuickNotes('');
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
    if (window.confirm('WARNING: Are you absolutely sure you want to clear your entire driver ride ledger? This action cannot be undone!')) {
      onClearAllRides();
    }
  };

  // Styling helper for platform badges
  const getPlatformColors = (plat: Ride['platform']) => {
    switch (plat) {
      case 'Uber':
        return 'bg-zinc-950 text-zinc-50 border-zinc-800/80';
      case 'Ola':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Rapido':
        return 'bg-amber-500/10 text-amber-450 border-amber-500/20';
      case 'Yandex':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Custom':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-750';
    }
  };

  return (
    <div className="space-y-6" id="history_ledger_section">
      {/* Header and Add Quick Ride Control */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h3 className="text-xl font-extrabold text-zinc-100 uppercase tracking-widest">Ride Ledger</h3>
          <p className="text-xs text-zinc-400">Review your past logs or punch in manual records</p>
        </div>

        <button
          onClick={() => { triggerClick(); setShowQuickLogForm(!showQuickLogForm); }}
          className={`w-full sm:w-auto py-2.5 px-4 active:scale-98 rounded-lg text-xs font-black uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
            showQuickLogForm 
              ? 'bg-zinc-800 text-zinc-350 hover:bg-zinc-750 border border-zinc-700/60 shadow' 
              : 'bg-green-500 hover:bg-green-400 text-zinc-950 border-b-2 border-green-700 shadow-md shadow-green-500/10'
          }`}
          id="btn_open_quick_log"
        >
          {showQuickLogForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
          {showQuickLogForm ? 'Close Logger' : 'Add Manual Record'}
        </button>
      </div>

      {/* Manual Quick Entry Form Accent */}
      {showQuickLogForm && (
        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-xl animate-fade-in" id="quick_log_container">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-4 flex items-center gap-1">Manual Journal Overwrite</h4>
          <form onSubmit={handleQuickLogSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Row 1: Platform Selection */}
            <div className="md:col-span-3 space-y-1">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Platform</label>
              <select
                value={quickPlatform}
                onChange={(e) => setQuickPlatform(e.target.value as Ride['platform'])}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 text-xs font-bold focus:outline-none focus:border-green-500 cursor-pointer"
              >
                {(['Uber', 'Ola', 'Rapido', 'Yandex', 'Custom', 'Personal'] as const).map(p => (
                  <option key={p} className="bg-zinc-900" value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Row 2: Earnings */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Earnings ({currency})</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={quickEarnings}
                onChange={(e) => setQuickEarnings(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs font-bold font-mono focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Row 3: Active Distance */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Paid route (km)</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={quickDistance}
                onChange={(e) => setQuickDistance(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs font-bold font-mono focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Row 4: Dead Distance */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Dead mileage (km)</label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={quickDeadKm}
                onChange={(e) => setQuickDeadKm(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs font-bold font-mono focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Row 5: Duration */}
            <div className="md:col-span-3 space-y-1">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Duration (Minutes)</label>
              <input
                type="number"
                required
                placeholder="Minutes (e.g. 24)"
                value={quickDurationMins}
                onChange={(e) => setQuickDurationMins(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100 text-xs font-bold font-mono focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Row 6: Remarks & Submission */}
            <div className="md:col-span-10 space-y-1">
              <label className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Notes / Traffic / Pickup remarks (Optional)</label>
              <input
                type="text"
                placeholder="Traffic jam, heavy rain, highway tolls..."
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-800 bg-zinc-950 font-bold text-zinc-200 text-xs focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 bg-green-500 hover:bg-green-400 active:scale-98 text-zinc-950 rounded-lg text-xs font-black uppercase tracking-widest cursor-pointer transition-all border-b-2 border-green-700"
              >
                Log Ride
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Filter and search parameters bar */}
      <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between" id="filter_options_ribbon">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search platform index, notes, etc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg bg-zinc-950 text-zinc-100 placeholder-zinc-500 border border-zinc-800/80 text-xs focus:outline-none focus:border-green-500 font-medium"
          />
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Quick Filter Selection */}
          {(['All', 'Uber', 'Ola', 'Rapido', 'Yandex', 'Custom'] as const).map(f => (
            <button
              key={f}
              onClick={() => { triggerClick(); setPlatformFilter(f); }}
              className={`py-1.5 px-3 rounded-lg text-[10px] uppercase font-bold border transition-colors cursor-pointer ${
                platformFilter === f
                  ? 'bg-green-500 border-green-500 text-zinc-950 font-black shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                  : 'bg-zinc-850 text-zinc-450 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {f}
            </button>
          ))}

          {/* Delete All Ledger */}
          {rides.length > 0 && (
            <button
              onClick={handleClearAll}
              className="py-1.5 px-2.5 bg-red-950/20 text-red-400 hover:bg-red-900/20 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500/25 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Primary History Ledger List */}
      <div className="space-y-4" id="ledger_list_items">
        {filteredRides.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-zinc-850 rounded-xl text-center bg-zinc-900/10 text-zinc-500">
            <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2 animate-bounce" />
            <h5 className="font-extrabold text-xs uppercase tracking-widest text-zinc-400">No historical rides match criteria</h5>
            <p className="text-xs text-zinc-500 mt-1">Change filters or use the manual "Add Quick Ride Log" button to make entries.</p>
          </div>
        ) : (
          filteredRides.slice().reverse().map((ride) => {
            const dateObj = new Date(ride.startTime);
            
            return (
              <div 
                key={ride.id}
                className="bg-zinc-900/20 rounded-xl border border-zinc-800/80 p-4 sm:p-5 flex flex-col md:flex-row justify-between gap-4 hover:border-zinc-700/80 hover:bg-zinc-900/30 transition-all animate-slideUp"
              >
                {/* Visual Label Column */}
                <div className="flex gap-3 items-start shrink-0">
                  <div className={`py-1 px-2.5 rounded border text-[10px] font-black tracking-wider uppercase ${getPlatformColors(ride.platform)}`}>
                    {ride.platform}
                  </div>
                  <div>
                    <h4 className="font-black text-zinc-200 text-xs uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                      Ride Recorded
                      {ride.notes && (
                        <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono normal-case">
                          {ride.notes}
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold uppercase tracking-widest mt-1">
                      <Calendar className="w-3 h-3 text-green-400" />
                      {dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                      {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Driving KPI Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 max-w-2xl px-0 md:px-4">
                  {/* Paid Distance */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Active Ride</span>
                    <span className="text-sm font-black text-zinc-200 font-mono">
                      {formatDistance(ride.distanceKm)}
                    </span>
                  </div>

                  {/* Unpaid Dead distance */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block flex items-center gap-0.5">
                      Dead Km
                      {ride.deadKm > 0 && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>}
                    </span>
                    <span className={`text-sm font-black font-mono ${ride.deadKm > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
                      {ride.deadKm > 0 ? `${ride.deadKm.toFixed(2)} km` : '0.00 km'}
                    </span>
                  </div>

                  {/* Travel duration and speed */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Duration</span>
                    <span className="text-sm text-zinc-350 font-extrabold font-mono">
                      {formatDuration(ride.durationSeconds)}
                    </span>
                  </div>

                  {/* Calculated fuel burned */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Fuel cost</span>
                    <span className="text-sm text-red-400 font-black font-mono">
                      {currency}{ride.fuelCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Ledger Financial Output */}
                <div className="flex md:flex-col justify-between items-end gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800">
                  <div className="text-right">
                    <div className="flex items-center md:justify-end gap-1 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                      Gross: {currency}{ride.earnings.toFixed(2)}
                    </div>
                    <div className={`text-base font-black tracking-tight mt-0.5 ${ride.profit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
                      {ride.profit >= 0 ? '+' : '-'}{currency}{Math.abs(ride.profit).toFixed(2)}
                    </div>
                  </div>

                  {/* Delete individual ride button */}
                  <button
                    onClick={() => handleDeleteRide(ride.id)}
                    className="p-2 text-zinc-605 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all cursor-pointer"
                    title="Delete Ride Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
