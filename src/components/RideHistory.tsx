import React, { useState, useMemo } from 'react';
import { Ride, VehicleConfig } from '../types';
import { formatDistance, formatDuration } from '../utils/geo';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Plus, Trash2, Search, Clock, Calendar, X, 
  Filter, ArrowUpDown, Download, Edit2, Copy, Eye,
  TrendingUp, Activity, Fuel, Zap, AlertOctagon, CheckCircle2,
  Gauge, Car, Share2, FileText, Map, Navigation, Shield, Bike
} from 'lucide-react';
import { RIDE_PROFILES } from '../config/rideProfiles';

interface RideHistoryProps {
  rides: Ride[];
  vehicle: VehicleConfig;
  currency: string;
  onRideLogged: (ride: Ride) => void;
  onRideDeleted: (id: string) => void;
  onClearAllRides: () => void;
}

type DateFilter = 'All Time' | 'Today' | 'Yesterday' | 'Last 7 Days' | 'This Month' | 'Custom';
type StatusFilter = 'All' | 'Excellent Profit' | 'Good Profit' | 'Low Profit' | 'Loss Ride';
type SortOption = 'Newest' | 'Oldest' | 'Highest Profit' | 'Lowest Profit' | 'Highest Earnings' | 'Lowest Earnings' | 'Longest Ride' | 'Shortest Ride' | 'Highest Distance' | 'Lowest Distance';

export default function RideHistory({ 
  rides, 
  vehicle, 
  currency, 
  onRideLogged, 
  onRideDeleted, 
  onClearAllRides 
}: RideHistoryProps) {
  // Advanced Filters & Search
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'All' | Ride['platform']>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All Time');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortOption, setSortOption] = useState<SortOption>('Newest');
  
  // Modals & Forms
  const [showQuickLogForm, setShowQuickLogForm] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  
  // Pagination
  const [visibleCount, setVisibleCount] = useState(20);

  // Quick Log form states
  const [quickPlatform, setQuickPlatform] = useState<Ride['platform']>('Cab Ride');
  const [quickEarnings, setQuickEarnings] = useState('');
  const [quickDistance, setQuickDistance] = useState('');
  const [quickDeadKm, setQuickDeadKm] = useState('');
  const [quickDurationMins, setQuickDurationMins] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [quickCategory, setQuickCategory] = useState('');
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});

  // Reset form fields when platform changes
  React.useEffect(() => {
    const profile = RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Custom'];
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
    const netProfit = earn - calculatedFuelCost; // Existing calculation preserved

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
    
    setQuickEarnings('');
    setQuickDistance('');
    setQuickDeadKm('');
    setQuickDurationMins('');
    setQuickNotes('');
    setDynamicFields({});
  };

  // ----------------------------------------------------
  // FILTERING, SORTING, & PROFIT INDICATOR LOGIC
  // ----------------------------------------------------

  const getProfitIndicator = (ride: Ride, profile: any) => {
    if (!profile.showEarnings) return null;
    const margin = ride.earnings > 0 ? (ride.profit / ride.earnings) * 100 : 0;
    const target = profile.targetProfitMargin || 40;
    
    if (ride.profit <= 0) return { label: 'Loss Ride', color: 'bg-red-500/10 text-red-400 border-red-500/30' };
    if (margin >= target + 10) return { label: 'Excellent Profit', color: 'bg-green-500/10 text-green-400 border-green-500/30' };
    if (margin >= target) return { label: 'Good Profit', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    return { label: 'Low Profit', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
  };

  const filteredAndSortedRides = useMemo(() => {
    let result = [...rides];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => {
        const profile = RIDE_PROFILES[r.platform] || RIDE_PROFILES['Custom'];
        const catLabel = profile.categories.find(c => c.id === r.rideCategory)?.label || r.rideCategory || '';
        const dynVals = r.dynamicFields ? Object.values(r.dynamicFields).join(' ') : '';
        const combined = `${r.platform} ${r.notes || ''} ${catLabel} ${dynVals}`.toLowerCase();
        return combined.includes(q);
      });
    }

    // Platform Filter
    if (platformFilter !== 'All') {
      result = result.filter(r => r.platform === platformFilter);
    }

    // Date Filter
    if (dateFilter !== 'All Time') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      result = result.filter(r => {
        const rideTime = new Date(r.startTime).getTime();
        if (dateFilter === 'Today') return rideTime >= startOfToday;
        if (dateFilter === 'Yesterday') return rideTime >= (startOfToday - 86400000) && rideTime < startOfToday;
        if (dateFilter === 'Last 7 Days') return rideTime >= (startOfToday - 7 * 86400000);
        if (dateFilter === 'This Month') return new Date(r.startTime).getMonth() === now.getMonth() && new Date(r.startTime).getFullYear() === now.getFullYear();
        return true;
      });
    }

    // Status Filter
    if (statusFilter !== 'All') {
      result = result.filter(r => {
        const p = RIDE_PROFILES[r.platform] || RIDE_PROFILES['Custom'];
        const ind = getProfitIndicator(r, p);
        if (!ind) return false; // Personal rides have no status
        return ind.label === statusFilter;
      });
    }

    // Sorting
    result.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      
      switch (sortOption) {
        case 'Oldest': return timeA - timeB;
        case 'Highest Profit': return b.profit - a.profit;
        case 'Lowest Profit': return a.profit - b.profit;
        case 'Highest Earnings': return b.earnings - a.earnings;
        case 'Lowest Earnings': return a.earnings - b.earnings;
        case 'Longest Ride': return b.durationSeconds - a.durationSeconds;
        case 'Shortest Ride': return a.durationSeconds - b.durationSeconds;
        case 'Highest Distance': return (b.distanceKm + b.deadKm) - (a.distanceKm + a.deadKm);
        case 'Lowest Distance': return (a.distanceKm + a.deadKm) - (b.distanceKm + b.deadKm);
        case 'Newest':
        default:
          return timeB - timeA;
      }
    });

    return result;
  }, [rides, search, platformFilter, dateFilter, statusFilter, sortOption]);

  // Derived Analytics from filtered list
  const analytics = useMemo(() => {
    let tEarn = 0, tProfit = 0, tDist = 0, tFuel = 0;
    let bestRide = null, worstRide = null, longestRide = null, shortestRide = null;

    filteredAndSortedRides.forEach(r => {
      tEarn += r.earnings;
      tProfit += r.profit;
      tDist += (r.distanceKm + r.deadKm);
      tFuel += r.fuelCost;

      if (!bestRide || r.profit > bestRide.profit) bestRide = r;
      if (!worstRide || r.profit < worstRide.profit) worstRide = r;
      if (!longestRide || r.durationSeconds > longestRide.durationSeconds) longestRide = r;
      if (!shortestRide || r.durationSeconds < shortestRide.durationSeconds) shortestRide = r;
    });

    const tRides = filteredAndSortedRides.length || 1;
    return {
      totalRides: filteredAndSortedRides.length,
      totalEarnings: tEarn,
      clearProfit: tProfit,
      totalDistance: tDist,
      fuelCost: tFuel,
      avgProfit: tProfit / tRides,
      avgDist: tDist / tRides,
      avgEarn: tEarn / tRides,
      bestRide, worstRide, longestRide, shortestRide
    };
  }, [filteredAndSortedRides]);

  // Grouping logic (Only enabled if sorting by date)
  const isDateSorted = sortOption === 'Newest' || sortOption === 'Oldest';
  
  const groupedRides = useMemo(() => {
    const groups: Record<string, { dateObj: Date, rides: Ride[], tEarn: number, tFuel: number, tProfit: number, tDist: number }> = {};
    
    if (!isDateSorted) return groups; // empty if not date sorted

    filteredAndSortedRides.forEach(r => {
      const d = new Date(r.startTime);
      const dateKey = d.toLocaleDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = { dateObj: d, rides: [], tEarn: 0, tFuel: 0, tProfit: 0, tDist: 0 };
      }
      groups[dateKey].rides.push(r);
      groups[dateKey].tEarn += r.earnings;
      groups[dateKey].tFuel += r.fuelCost;
      groups[dateKey].tProfit += r.profit;
      groups[dateKey].tDist += (r.distanceKm + r.deadKm);
    });

    return groups;
  }, [filteredAndSortedRides, isDateSorted]);


  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  const handleDeleteRide = (id: string) => {
    triggerClick();
    if (window.confirm('Delete this ride record permanently?')) {
      onRideDeleted(id);
      if (selectedRideId === id) setSelectedRideId(null);
    }
  };

  const handleClearAll = () => {
    triggerClick();
    if (window.confirm('WARNING: Are you sure you want to delete ALL ride records? This cannot be undone!')) {
      onClearAllRides();
    }
  };

  const handleComingSoon = () => {
    triggerClick();
    alert("This feature is coming soon in the next update!");
  };

  // Helper for rendering dynamic fields beautifully
  const renderDynamicFields = (ride: Ride, inline = false) => {
    const profile = RIDE_PROFILES[ride.platform] || RIDE_PROFILES['Custom'];
    if (!ride.dynamicFields || Object.keys(ride.dynamicFields).length === 0) return null;

    return (
      <div className={`flex flex-wrap gap-3 ${inline ? '' : 'pt-3 border-t border-zinc-900 mt-2'}`}>
        {Object.entries(ride.dynamicFields).map(([key, val]) => {
          if (!val || val === 0) return null;
          const fieldDef = profile.dynamicFields?.find(f => f.id === key);
          const label = fieldDef?.label || key;
          const prefix = fieldDef?.type === 'currency' ? currency : '';
          const suffix = fieldDef?.suffix ? ` ${fieldDef.suffix}` : '';
          return (
            <div key={key} className="text-[10px] font-black uppercase flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded">
              <span className="text-zinc-500">{label}</span>
              <span className="text-zinc-200">{prefix}{val}{suffix}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Selected Ride object for Modal
  const selectedRide = selectedRideId ? rides.find(r => r.id === selectedRideId) : null;

  return (
    <div className="space-y-4" id="history_ledger_section">
      
      {/* 1. SUMMARY DASHBOARD */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-zinc-900/50 rounded-lg">
          <span className="text-[10px] font-black text-zinc-500 uppercase block">Total Rides</span>
          <span className="text-xl font-black text-white">{analytics.totalRides}</span>
        </div>
        <div className="p-3 bg-zinc-900/50 rounded-lg">
          <span className="text-[10px] font-black text-zinc-500 uppercase block">Total Earnings</span>
          <span className="text-xl font-black text-green-400">{currency}{analytics.totalEarnings.toFixed(2)}</span>
        </div>
        <div className="p-3 bg-zinc-900/50 rounded-lg">
          <span className="text-[10px] font-black text-zinc-500 uppercase block">Clear Profit</span>
          <span className={`text-xl font-black ${analytics.clearProfit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
            {analytics.clearProfit >= 0 ? '+' : '-'}{currency}{Math.abs(analytics.clearProfit).toFixed(2)}
          </span>
        </div>
        <div className="p-3 bg-zinc-900/50 rounded-lg">
          <span className="text-[10px] font-black text-zinc-500 uppercase block">Fuel Cost</span>
          <span className="text-xl font-black text-red-400">{currency}{analytics.fuelCost.toFixed(2)}</span>
        </div>
        <div className="p-3 bg-zinc-900/50 rounded-lg">
          <span className="text-[10px] font-black text-zinc-500 uppercase block">Total Distance</span>
          <span className="text-xl font-black text-blue-400">{formatDistance(analytics.totalDistance)}</span>
        </div>
        <div className="p-3 bg-zinc-900/50 rounded-lg">
          <span className="text-[10px] font-black text-zinc-500 uppercase block">Avg Profit/Ride</span>
          <span className="text-xl font-black text-emerald-400">{currency}{analytics.avgProfit.toFixed(2)}</span>
        </div>
      </div>

      {/* Header and Add Quick Ride Control */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pt-2">
        <div>
          <h3 className="text-sm font-black text-zinc-150 uppercase tracking-wide">Professional Ride Ledger</h3>
          <p className="text-xs text-zinc-500">Review history, analyze profits, and track earnings</p>
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

      {/* Quick Log Form (Hidden by default) */}
      {showQuickLogForm && (
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4 shadow-xl" id="quick_log_container">
          <h4 className="text-xs font-black uppercase text-green-400">Enter Ride details manually</h4>
          <form onSubmit={handleQuickLogSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Same form as before... */}
            <div className="md:col-span-3 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Ride Type</label>
              <select value={quickPlatform} onChange={(e) => setQuickPlatform(e.target.value as Ride['platform'])} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black">
                {Object.values(RIDE_PROFILES).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {(() => {
              const profile = RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Custom'];
              return profile.showRideCategory ? (
                <div className="md:col-span-3 space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">{profile.categoryLabel}</label>
                  <select value={quickCategory} onChange={(e) => setQuickCategory(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black">
                    {profile.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              ) : <div className="md:col-span-3"></div>;
            })()}

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Money Got ({currency})</label>
              <input type="number" step="any" required disabled={!(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showEarnings} value={!(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showEarnings ? '0' : quickEarnings} onChange={(e) => setQuickEarnings(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono disabled:opacity-50" />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">{(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showDeadKm ? 'Earning KM' : 'Distance'}</label>
              <input type="number" step="any" required value={quickDistance} onChange={(e) => setQuickDistance(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono" />
            </div>

            {(RIDE_PROFILES[quickPlatform] || RIDE_PROFILES['Cab Ride']).showDeadKm && (
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[10px] font-black text-zinc-400 uppercase">Non-Earning KM</label>
                <input type="number" step="any" value={quickDeadKm} onChange={(e) => setQuickDeadKm(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono" />
              </div>
            )}

            <div className="md:col-span-3 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Time Taken (Mins)</label>
              <input type="number" required value={quickDurationMins} onChange={(e) => setQuickDurationMins(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono" />
            </div>

            <div className="md:col-span-12 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Notes (Optional)</label>
              <input type="text" value={quickNotes} onChange={(e) => setQuickNotes(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
            </div>

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
                        <select value={dynamicFields[field.id] || ''} onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.id]: e.target.value }))} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black cursor-pointer">
                          {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <div className="relative">
                          <input type={field.type === 'number' ? 'number' : 'text'} step={field.type === 'number' ? 'any' : undefined} value={dynamicFields[field.id] || ''} onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.id]: field.type === 'number' ? (parseFloat(e.target.value) || e.target.value) : e.target.value }))} placeholder={field.placeholder || "0"} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                          {field.suffix && <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><span className="text-[10px] text-zinc-500 font-black uppercase">{field.suffix}</span></div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="md:col-span-2 flex items-end">
              <button type="submit" className="w-full py-3 bg-green-500 text-black rounded-lg text-xs font-black uppercase cursor-pointer border-b-2 border-green-700">Log Ride</button>
            </div>
          </form>
        </div>
      )}

      {/* 2. ADVANCED FILTERS & SORTING */}
      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 shadow-sm space-y-3" id="filter_options_ribbon">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder="Search rides, notes, locations or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 w-full rounded-lg bg-black text-white placeholder-zinc-500 border border-zinc-900 text-xs font-black"
          />
        </div>

        {/* Filters Row */}
        <div className="flex gap-3 flex-wrap items-center justify-between">
          <div className="flex gap-2 flex-wrap flex-1">
            <select value={platformFilter} onChange={e => { triggerClick(); setPlatformFilter(e.target.value as any); }} className="py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-black text-zinc-300 uppercase cursor-pointer">
              <option value="All">All Types</option>
              {Object.values(RIDE_PROFILES).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <select value={dateFilter} onChange={e => { triggerClick(); setDateFilter(e.target.value as any); }} className="py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-black text-zinc-300 uppercase cursor-pointer">
              {['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'This Month', 'Custom'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <select value={statusFilter} onChange={e => { triggerClick(); setStatusFilter(e.target.value as any); }} className="py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-black text-zinc-300 uppercase cursor-pointer">
              {['All', 'Excellent Profit', 'Good Profit', 'Low Profit', 'Loss Ride'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2">
              <ArrowUpDown className="w-3 h-3 text-zinc-500" />
              <select value={sortOption} onChange={e => { triggerClick(); setSortOption(e.target.value as any); }} className="py-2 bg-transparent text-xs font-black text-zinc-300 uppercase cursor-pointer outline-none">
                {['Newest', 'Oldest', 'Highest Profit', 'Lowest Profit', 'Highest Earnings', 'Lowest Earnings', 'Longest Ride', 'Shortest Ride', 'Highest Distance', 'Lowest Distance'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Export Buttons (Future Architecture) */}
            <button onClick={handleComingSoon} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Export PDF"><FileText className="w-4 h-4" /></button>
            <button onClick={handleComingSoon} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Export Excel"><FileSpreadsheet className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* 3. QUICK ANALYTICS (Only show if multiple rides exist) */}
      {filteredAndSortedRides.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {analytics.bestRide && (
            <div className="shrink-0 p-3 bg-green-500/10 border border-green-500/20 rounded-lg min-w-[140px]">
              <span className="text-[10px] font-black text-green-500 uppercase flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Best Ride</span>
              <span className="block mt-1 text-sm font-black text-zinc-200">{currency}{analytics.bestRide.profit.toFixed(2)}</span>
            </div>
          )}
          {analytics.longestRide && (
            <div className="shrink-0 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg min-w-[140px]">
              <span className="text-[10px] font-black text-blue-400 uppercase flex items-center gap-1"><Map className="w-3 h-3"/> Longest Ride</span>
              <span className="block mt-1 text-sm font-black text-zinc-200">{formatDistance(analytics.longestRide.distanceKm + analytics.longestRide.deadKm)}</span>
            </div>
          )}
          {analytics.worstRide && (
            <div className="shrink-0 p-3 bg-red-500/10 border border-red-500/20 rounded-lg min-w-[140px]">
              <span className="text-[10px] font-black text-red-400 uppercase flex items-center gap-1"><TrendingDown className="w-3 h-3"/> Worst Ride</span>
              <span className="block mt-1 text-sm font-black text-zinc-200">{currency}{analytics.worstRide.profit.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* 4. RIDE LEDGER LIST */}
      <div className="space-y-6" id="ledger_list_items">
        {filteredAndSortedRides.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-zinc-900 rounded-xl text-center bg-zinc-950 text-zinc-500 flex flex-col items-center">
            <Shield className="w-10 h-10 text-zinc-700 mb-3" />
            <h5 className="font-black text-sm uppercase text-zinc-300">No rides recorded yet</h5>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">Start your first ride or log one manually. Your complete ride ledger and financial history will appear here.</p>
            <button onClick={() => setShowQuickLogForm(true)} className="mt-4 py-2 px-4 bg-green-500 text-black text-xs font-black uppercase rounded border-b-2 border-green-700">Log First Ride</button>
          </div>
        ) : (
          isDateSorted ? (
            // GROUPED BY DATE
            Object.entries(groupedRides).map(([dateStr, group]) => (
              <div key={dateStr} className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mt-4 first:mt-0">
                  <h4 className="text-sm font-black text-zinc-200 uppercase flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-400" />
                    {group.dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h4>
                  <div className="text-[10px] font-black text-zinc-500 uppercase flex gap-3">
                    <span>{group.rides.length} Rides</span>
                    <span className="text-green-400">Profit: {currency}{group.tProfit.toFixed(2)}</span>
                  </div>
                </div>
                {group.rides.slice(0, visibleCount).map(ride => (
                  <LedgerCard key={ride.id} ride={ride} currency={currency} onSelect={() => setSelectedRideId(ride.id)} onDelete={() => handleDeleteRide(ride.id)} getIndicator={getProfitIndicator} />
                ))}
              </div>
            ))
          ) : (
            // FLAT LIST (Non-Date Sorted)
            <div className="space-y-3">
              {filteredAndSortedRides.slice(0, visibleCount).map(ride => (
                <LedgerCard key={ride.id} ride={ride} currency={currency} onSelect={() => setSelectedRideId(ride.id)} onDelete={() => handleDeleteRide(ride.id)} getIndicator={getProfitIndicator} />
              ))}
            </div>
          )
        )}
        
        {/* Pagination Load More */}
        {filteredAndSortedRides.length > visibleCount && (
          <button onClick={() => setVisibleCount(v => v + 20)} className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl text-xs font-black uppercase hover:bg-zinc-800 hover:text-white transition-colors">
            Load More Rides
          </button>
        )}
      </div>

      {/* 5. RIDE DETAILS MODAL */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRideId(null)}>
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-zinc-950/90 backdrop-blur border-b border-zinc-900 p-4 flex justify-between items-center z-10">
              <h3 className="text-sm font-black text-zinc-100 uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-400" /> Ride Details
              </h3>
              <button onClick={() => setSelectedRideId(null)} className="p-1 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-5 space-y-6">
              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <div className={`inline-flex py-1 px-2 rounded border text-[10px] font-black uppercase items-center gap-1 mb-2 ${RIDE_PROFILES[selectedRide.platform]?.badgeClass || 'bg-zinc-800 text-white'}`}>
                    {selectedRide.platform}
                  </div>
                  <h4 className="text-lg font-black text-white">{new Date(selectedRide.startTime).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}</h4>
                  <p className="text-xs text-zinc-400 font-bold mt-1">
                    {new Date(selectedRide.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedRide.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 font-black uppercase block">Net Profit</span>
                  <span className={`text-2xl font-black font-mono ${selectedRide.profit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
                    {selectedRide.profit >= 0 ? '+' : '-'}{currency}{Math.abs(selectedRide.profit).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Ride KPI Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">Duration</span>
                  <span className="block mt-1 text-sm font-black text-zinc-200">{formatDuration(selectedRide.durationSeconds)}</span>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">Distance</span>
                  <span className="block mt-1 text-sm font-black text-zinc-200">{formatDistance(selectedRide.distanceKm + selectedRide.deadKm)}</span>
                </div>
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <span className="text-[9px] font-black text-zinc-500 uppercase">Profit / KM</span>
                  <span className="block mt-1 text-sm font-black text-green-400">{currency}{(selectedRide.profit / (selectedRide.distanceKm || 1)).toFixed(2)}</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div>
                <h5 className="text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-900 pb-2 mb-3">Financial Ledger</h5>
                <div className="space-y-2 text-xs font-black uppercase">
                  <div className="flex justify-between text-zinc-300">
                    <span>Income (Gross Fare)</span>
                    <span className="font-mono">{currency}{selectedRide.earnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-400">
                    <span>Fuel Cost</span>
                    <span className="font-mono">-{currency}{selectedRide.fuelCost.toFixed(2)}</span>
                  </div>
                  {/* Derived values for Ledger depth */}
                  {(() => {
                    const profile = RIDE_PROFILES[selectedRide.platform] || RIDE_PROFILES['Custom'];
                    if (!profile.showEarnings) return null;
                    const commission = selectedRide.earnings * (profile.commissionPercentage / 100);
                    const service = (selectedRide.distanceKm + selectedRide.deadKm) * profile.serviceCostPerKm;
                    return (
                      <>
                        <div className="flex justify-between text-red-300">
                          <span>Est. Commission ({profile.commissionPercentage}%)</span>
                          <span className="font-mono">-{currency}{commission.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-300">
                          <span>Est. Service Cost</span>
                          <span className="font-mono">-{currency}{service.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Vehicle & Dynamic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-900 pb-2 mb-3">Vehicle Details</h5>
                  <div className="space-y-1.5 text-[10px] font-black uppercase text-zinc-300">
                    <p>Type: <span className="text-zinc-500">{selectedRide.vehicleType}</span></p>
                    <p>Mileage: <span className="text-zinc-500">{selectedRide.mileageAtTime} km/l</span></p>
                    <p>Fuel Price: <span className="text-zinc-500">{currency}{selectedRide.fuelPriceAtTime}</span></p>
                  </div>
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-900 pb-2 mb-3">Ride Extras</h5>
                  {selectedRide.notes && (
                    <div className="mb-2">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">Notes</span>
                      <p className="text-xs text-zinc-300 bg-zinc-900 p-2 rounded mt-1">{selectedRide.notes}</p>
                    </div>
                  )}
                  {renderDynamicFields(selectedRide, true)}
                </div>
              </div>

              {/* Future Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-zinc-900">
                <button onClick={handleComingSoon} className="flex-1 py-3 bg-zinc-900 text-zinc-300 text-xs font-black uppercase rounded-lg border border-zinc-800 flex items-center justify-center gap-1.5 hover:bg-zinc-800">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={handleComingSoon} className="flex-1 py-3 bg-zinc-900 text-zinc-300 text-xs font-black uppercase rounded-lg border border-zinc-800 flex items-center justify-center gap-1.5 hover:bg-zinc-800">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
                <button onClick={handleComingSoon} className="flex-1 py-3 bg-blue-500/10 text-blue-400 text-xs font-black uppercase rounded-lg border border-blue-500/20 flex items-center justify-center gap-1.5 hover:bg-blue-500/20">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// HELPER: Ledger Card Component
// ----------------------------------------------------
function LedgerCard({ ride, currency, onSelect, onDelete, getIndicator }: { ride: Ride, currency: string, onSelect: () => void, onDelete: () => void, getIndicator: any }) {
  const profile = RIDE_PROFILES[ride.platform] || RIDE_PROFILES['Custom'];
  const indicator = getIndicator(ride, profile);
  
  // Calculate display-only ledger estimates based on profile
  const commission = profile.showEarnings ? ride.earnings * (profile.commissionPercentage / 100) : 0;
  const serviceCost = (ride.distanceKm + ride.deadKm) * profile.serviceCostPerKm;
  const profitPerKm = (ride.distanceKm > 0) ? ride.profit / ride.distanceKm : 0;

  return (
    <div className="bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="p-4 flex flex-col md:flex-row justify-between gap-4 w-full">
        
        {/* Left: App & Time */}
        <div className="flex gap-3 items-start shrink-0 min-w-[200px]">
          <div className={`py-1.5 px-3 rounded-lg border text-[10px] font-black uppercase flex flex-col items-center gap-1 ${profile.badgeClass}`}>
            <profile.icon className="w-4 h-4" />
            <span>{ride.platform.split(' ')[0]}</span>
          </div>
          <div>
            <h4 className="font-black text-zinc-200 text-xs uppercase flex items-center gap-1.5 flex-wrap">
              {new Date(ride.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {indicator && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${indicator.color}`}>
                  {indicator.label}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold uppercase tracking-wider mt-1">
              <Clock className="w-3 h-3 text-zinc-400" />
              {formatDuration(ride.durationSeconds)}
            </p>
            {ride.rideCategory && (
              <p className="text-[9px] font-black text-zinc-400 uppercase mt-1 bg-zinc-900 inline-block px-1.5 py-0.5 rounded">
                {profile.categories?.find(c => c.id === ride.rideCategory)?.label || ride.rideCategory}
              </p>
            )}
          </div>
        </div>

        {/* Middle: Financial Ledger KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 flex-1 text-[10px] font-black uppercase border-y md:border-y-0 md:border-x border-zinc-900 py-3 md:py-0 md:px-4">
          <div>
            <span className="text-zinc-550 block">Distance</span>
            <span className="text-sm font-mono text-zinc-200">{formatDistance(ride.distanceKm + ride.deadKm)}</span>
          </div>
          {profile.showEarnings && (
            <div>
              <span className="text-zinc-550 block">Income</span>
              <span className="text-sm font-mono text-white">{currency}{ride.earnings.toFixed(2)}</span>
            </div>
          )}
          <div>
            <span className="text-zinc-550 block">Fuel Cost</span>
            <span className="text-sm font-mono text-red-400">{currency}{ride.fuelCost.toFixed(2)}</span>
          </div>
          {profile.showEarnings && (
            <div>
              <span className="text-zinc-550 block">Service Cost</span>
              <span className="text-sm font-mono text-amber-500">{currency}{serviceCost.toFixed(2)}</span>
            </div>
          )}
          {profile.showEarnings && (
            <div className="hidden lg:block">
              <span className="text-zinc-550 block">Profit/KM</span>
              <span className="text-sm font-mono text-green-400">{currency}{profitPerKm.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Right: Net Profit & Actions */}
        <div className="flex md:flex-col justify-between items-end gap-3 shrink-0 min-w-[120px]">
          <div className="text-right w-full flex md:block justify-between items-center">
            <span className="text-[10px] text-zinc-550 font-black uppercase md:block">Net Profit</span>
            <span className={`text-xl font-black font-mono tracking-tight md:mt-0.5 md:block ${ride.profit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
              {ride.profit >= 0 ? '+' : '-'}{currency}{Math.abs(ride.profit).toFixed(2)}
            </span>
          </div>

          <div className="flex gap-1">
            <button onClick={onSelect} className="p-1.5 bg-zinc-900 text-zinc-400 hover:text-white rounded flex items-center gap-1 text-[9px] font-black uppercase transition-colors">
              <Eye className="w-3.5 h-3.5" /> View
            </button>
            <button onClick={onDelete} className="p-1.5 bg-zinc-900 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Dynamic Fields Bar */}
      {ride.dynamicFields && Object.keys(ride.dynamicFields).length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {Object.entries(ride.dynamicFields).map(([key, val]) => {
            if (!val || val === 0) return null;
            const fieldDef = profile.dynamicFields?.find(f => f.id === key);
            return (
              <div key={key} className="text-[9px] font-black uppercase bg-zinc-900 px-2 py-1 rounded-sm text-zinc-400">
                {fieldDef?.label || key}: <span className="text-zinc-200">{fieldDef?.type === 'currency' ? currency : ''}{val}{fieldDef?.suffix ? ` ${fieldDef.suffix}` : ''}</span>
              </div>
            );
          })}
          {ride.notes && (
             <div className="text-[9px] font-black uppercase bg-zinc-900 px-2 py-1 rounded-sm text-zinc-400 truncate max-w-xs">
                Notes: <span className="text-zinc-200">{ride.notes}</span>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
