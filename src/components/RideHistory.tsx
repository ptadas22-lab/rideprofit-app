import React, { useState } from 'react';
import { Ride, VehicleConfig } from '../types';
import { formatDistance, formatDuration } from '../utils/geo';
import { feedbackAudio, triggerHapticFeedback } from '../utils/audio';
import { 
  Plus, 
  Trash2, 
  Search, 
  Clock, 
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
  const [quickPlatform, setQuickPlatform] = useState<Ride['platform']>('Cab Ride');
  const [quickEarnings, setQuickEarnings] = useState('');
  const [quickDistance, setQuickDistance] = useState('');
  const [quickDeadKm, setQuickDeadKm] = useState('');
  const [quickDurationMins, setQuickDurationMins] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  
  // Quick Log Extras State
  const [cabTips, setCabTips] = useState('');
  const [cabTolls, setCabTolls] = useState('');
  
  const [autoWaitingTime, setAutoWaitingTime] = useState('');
  const [autoFuelType, setAutoFuelType] = useState('Petrol');
  
  const [bikeOrders, setBikeOrders] = useState('');
  const [bikePlatform, setBikePlatform] = useState('Rapido');
  
  const [deliveryOrders, setDeliveryOrders] = useState('');
  const [deliveryPickup, setDeliveryPickup] = useState('');
  const [deliveryDrop, setDeliveryDrop] = useState('');
  const [deliveryPlatform, setDeliveryPlatform] = useState('Swiggy');
  
  const [personalPurpose, setPersonalPurpose] = useState('');
  const [personalExpense, setPersonalExpense] = useState('');

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

    const earn = quickPlatform === 'Personal' ? 0 : (parseFloat(quickEarnings) || 0);
    const dist = parseFloat(quickDistance) || 0;
    const dead = parseFloat(quickDeadKm) || 0;
    const durationMins = parseFloat(quickDurationMins) || 15;

    const totalDist = dist + dead;
    const totalFuelUsed = totalDist / (vehicle.mileage || 1);
    const calculatedFuelCost = totalFuelUsed * vehicle.fuelPrice;
    const netProfit = earn - calculatedFuelCost;

    let rideExtras: any = undefined;
    if (quickPlatform === 'Cab Ride') {
      if (cabTips || cabTolls) rideExtras = { tips: parseFloat(cabTips) || 0, tollCharges: parseFloat(cabTolls) || 0 };
    } else if (quickPlatform === 'Auto Ride') {
      rideExtras = { waitingTimeMins: parseFloat(autoWaitingTime) || 0, fuelType: autoFuelType };
    } else if (quickPlatform === 'Bike Ride') {
      rideExtras = { ordersCompleted: parseInt(bikeOrders) || 0, platform: bikePlatform };
    } else if (quickPlatform === 'Delivery Ride') {
      rideExtras = { ordersCompleted: parseInt(deliveryOrders) || 0, pickupDistance: parseFloat(deliveryPickup) || 0, deliveryDistance: parseFloat(deliveryDrop) || 0, platform: deliveryPlatform };
    } else if (quickPlatform === 'Personal') {
      rideExtras = { tripPurpose: personalPurpose, tripExpense: parseFloat(personalExpense) || 0 };
    }

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
      rideExtras
    };

    onRideLogged(newRide);
    setShowQuickLogForm(false);
    
    // Reset Form
    setQuickEarnings('');
    setQuickDistance('');
    setQuickDeadKm('');
    setQuickDurationMins('');
    setQuickNotes('');
    
    // Reset Extras Form
    setCabTips(''); setCabTolls('');
    setAutoWaitingTime(''); setAutoFuelType('Petrol');
    setBikeOrders(''); setBikePlatform('Rapido');
    setDeliveryOrders(''); setDeliveryPickup(''); setDeliveryDrop(''); setDeliveryPlatform('Swiggy');
    setPersonalPurpose(''); setPersonalExpense('');
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

  // Styling helper for platform badges
  const getPlatformColors = (plat: Ride['platform']) => {
    switch (plat) {
      case 'Cab Ride':
        return 'bg-zinc-900 text-zinc-100 border-zinc-800';
      case 'Auto Ride':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Bike Ride':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Delivery Ride':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'Custom':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

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
                {(['Cab Ride', 'Auto Ride', 'Bike Ride', 'Delivery Ride', 'Custom', 'Personal'] as const).map(p => (
                  <option key={p} className="bg-zinc-950" value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Earnings */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Money Got ({currency})</label>
              <input
                type="number"
                step="any"
                required
                disabled={quickPlatform === 'Personal'}
                placeholder="0.00"
                value={quickPlatform === 'Personal' ? '0' : quickEarnings}
                onChange={(e) => setQuickEarnings(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-white text-xs font-black font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {quickPlatform === 'Personal' && (
                <p className="text-[9px] text-amber-500 font-bold mt-1">Personal trip — no earnings.</p>
              )}
            </div>

            {/* Active Distance */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[10px] font-black text-zinc-400 uppercase">Earning KM</label>
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

            {/* Ride Extras Render for Quick Log */}
            {quickPlatform === 'Cab Ride' && (
              <div className="md:col-span-12 grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Tips ({currency})</label>
                  <input type="number" step="any" value={cabTips} onChange={e => setCabTips(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Tolls ({currency})</label>
                  <input type="number" step="any" value={cabTolls} onChange={e => setCabTolls(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
              </div>
            )}
            
            {quickPlatform === 'Auto Ride' && (
              <div className="md:col-span-12 grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Wait Time (Min)</label>
                  <input type="number" step="any" value={autoWaitingTime} onChange={e => setAutoWaitingTime(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Fuel Type</label>
                  <select value={autoFuelType} onChange={e => setAutoFuelType(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black cursor-pointer">
                    <option value="Petrol">Petrol</option>
                    <option value="CNG">CNG</option>
                  </select>
                </div>
              </div>
            )}
            
            {quickPlatform === 'Bike Ride' && (
              <div className="md:col-span-12 grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Orders / Drops</label>
                  <input type="number" step="1" value={bikeOrders} onChange={e => setBikeOrders(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Platform</label>
                  <select value={bikePlatform} onChange={e => setBikePlatform(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black cursor-pointer">
                    <option value="Rapido">Rapido</option>
                    <option value="Uber Moto">Uber Moto</option>
                    <option value="Ola Bike">Ola Bike</option>
                  </select>
                </div>
              </div>
            )}
            
            {quickPlatform === 'Delivery Ride' && (
              <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-zinc-900">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Orders</label>
                  <input type="number" step="1" value={deliveryOrders} onChange={e => setDeliveryOrders(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Platform</label>
                  <select value={deliveryPlatform} onChange={e => setDeliveryPlatform(e.target.value)} className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black cursor-pointer">
                    <option value="Swiggy">Swiggy</option>
                    <option value="Zomato">Zomato</option>
                    <option value="Blinkit">Blinkit</option>
                    <option value="Porter">Porter</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Pickup Dist</label>
                  <input type="number" step="any" value={deliveryPickup} onChange={e => setDeliveryPickup(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Drop Dist</label>
                  <input type="number" step="any" value={deliveryDrop} onChange={e => setDeliveryDrop(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
              </div>
            )}
            
            {quickPlatform === 'Personal' && (
              <div className="md:col-span-12 grid grid-cols-2 gap-3 pt-2 border-t border-zinc-900">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Trip Purpose</label>
                  <input type="text" value={personalPurpose} onChange={e => setPersonalPurpose(e.target.value)} placeholder="e.g. Groceries" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase">Trip Expense ({currency})</label>
                  <input type="number" step="any" value={personalExpense} onChange={e => setPersonalExpense(e.target.value)} placeholder="0" className="w-full p-2.5 rounded-lg border border-zinc-900 bg-black text-zinc-200 text-xs font-black" />
                </div>
              </div>
            )}

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
                  <div className={`py-1.5 px-3 rounded-lg border text-[10px] font-black uppercase ${getPlatformColors(ride.platform)}`}>
                    {ride.platform}
                  </div>
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
                    <span className="text-[10px] font-bold text-zinc-550 block">Earning KM</span>
                    <span className="text-sm font-black text-zinc-200 font-mono">
                      {formatDistance(ride.distanceKm)}
                    </span>
                  </div>

                  {/* Unpaid Dead distance */}
                  <div>
                    <span className="text-[10px] font-bold text-zinc-550 block">Non-Earning KM</span>
                    <span className={`text-sm font-black font-mono ${ride.deadKm > 0 ? 'text-amber-500' : 'text-zinc-500'}`}>
                      {ride.deadKm > 0 ? `${ride.deadKm.toFixed(2)} km` : '0.00 km'}
                    </span>
                  </div>

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

                {/* Optional Ride Extras Section */}
                {ride.rideExtras && Object.keys(ride.rideExtras).length > 0 && (
                  <div className="border-t border-zinc-900 pt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase text-zinc-300">
                    {ride.rideExtras.tips > 0 && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Tips: <span className="text-green-400">{currency}{ride.rideExtras.tips}</span></span>}
                    {ride.rideExtras.tollCharges > 0 && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Tolls: <span className="text-red-400">{currency}{ride.rideExtras.tollCharges}</span></span>}
                    
                    {ride.rideExtras.waitingTimeMins > 0 && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Wait: <span className="text-zinc-100">{ride.rideExtras.waitingTimeMins} Min</span></span>}
                    {ride.rideExtras.fuelType && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Fuel: <span className="text-zinc-100">{ride.rideExtras.fuelType}</span></span>}
                    
                    {ride.rideExtras.ordersCompleted > 0 && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Orders: <span className="text-emerald-400">{ride.rideExtras.ordersCompleted}</span></span>}
                    {ride.rideExtras.platform && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Platform: <span className="text-zinc-100">{ride.rideExtras.platform}</span></span>}
                    {ride.rideExtras.pickupDistance > 0 && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Pickup: <span className="text-zinc-100">{ride.rideExtras.pickupDistance} KM</span></span>}
                    {ride.rideExtras.deliveryDistance > 0 && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Drop: <span className="text-zinc-100">{ride.rideExtras.deliveryDistance} KM</span></span>}
                    
                    {ride.rideExtras.tripPurpose && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Purpose: <span className="text-zinc-100">{ride.rideExtras.tripPurpose}</span></span>}
                    {ride.rideExtras.tripExpense > 0 && <span className="bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Expense: <span className="text-red-400">{currency}{ride.rideExtras.tripExpense}</span></span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
