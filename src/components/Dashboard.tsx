import React, { useMemo } from 'react';
import { Ride, VehicleConfig } from '../types';
import { formatDistance, formatDuration } from '../utils/geo';
import { 
  TrendingUp, 
  MapPinOff, 
  Fuel, 
  PiggyBank, 
  Calendar, 
  Zap, 
  AlertTriangle, 
  Award,
  CirclePercent,
  CheckCircle2
} from 'lucide-react';

interface DashboardProps {
  rides: Ride[];
  vehicle: VehicleConfig;
  currency: string;
}

export default function Dashboard({ rides, vehicle, currency }: DashboardProps) {
  // Compute overall stats
  const stats = useMemo(() => {
    let totalEarnings = 0;
    let totalDistanceSecured = 0;
    let totalDeadKm = 0;
    let totalFuelCost = 0;
    let totalDurationSeconds = 0;

    rides.forEach(ride => {
      totalEarnings += ride.earnings;
      totalDistanceSecured += ride.distanceKm;
      totalDeadKm += ride.deadKm;
      totalFuelCost += ride.fuelCost;
      totalDurationSeconds += ride.durationSeconds;
    });

    const totalDistanceEverything = totalDistanceSecured + totalDeadKm;
    const totalProfit = totalEarnings - totalFuelCost;
    
    // Percent of total driving that is dead km
    const deadKmPercent = totalDistanceEverything > 0 
      ? (totalDeadKm / totalDistanceEverything) * 100 
      : 0;

    // Revenue per km (Overall)
    const revPerKm = totalDistanceEverything > 0 ? totalEarnings / totalDistanceEverything : 0;
    // Costs per km (Fuel only)
    const costPerKm = totalDistanceEverything > 0 ? totalFuelCost / totalDistanceEverything : 0;
    // Profit per km
    const profitPerKm = revPerKm - costPerKm;

    // Profit Per Hour (Total Profit / Total Hours)
    const profitPerHour = totalDurationSeconds > 0 
      ? (totalProfit / (totalDurationSeconds / 3600)) 
      : 0;

    return {
      totalEarnings,
      totalDistanceSecured,
      totalDeadKm,
      totalDistanceEverything,
      totalFuelCost,
      totalProfit,
      totalDurationSeconds,
      deadKmPercent,
      revPerKm,
      costPerKm,
      profitPerKm,
      profitPerHour,
      ridesCount: rides.length
    };
  }, [rides]);

  // Insights computation (Very simple English)
  const insights = useMemo(() => {
    const list: Array<{ id: string; type: 'success' | 'warning' | 'info'; title: string; desc: string }> = [];

    if (stats.ridesCount === 0) {
      list.push({
        id: 'no_data',
        type: 'info',
        title: 'Welcome to RideProfit!',
        desc: 'Go to the "Start Ride" tab to log your first ride and see how much profit you made!',
      });
      return list;
    }

    // Dead KM Check
    if (stats.deadKmPercent > 25) {
      list.push({
        id: 'high_dead_km',
        type: 'warning',
        title: 'High Non-Earning KM Alert',
        desc: `You drove ${stats.deadKmPercent.toFixed(0)}% of your distance empty. Try parking in crowded areas instead of driving around.`,
      });
    } else if (stats.deadKmPercent > 0) {
      list.push({
        id: 'low_dead_km',
        type: 'success',
        title: 'Excellent Driving Strategy!',
        desc: `You only drove ${stats.deadKmPercent.toFixed(0)}% empty. Very good job of finding customer rides quickly!`,
      });
    }

    // Profit margin check
    const profitMargin = stats.totalEarnings > 0 ? (stats.totalProfit / stats.totalEarnings) * 100 : 0;
    if (profitMargin < 40 && stats.totalEarnings > 0) {
      list.push({
        id: 'low_margin',
        type: 'warning',
        title: 'High Fuel Expense Warning',
        desc: `Fuel took away ${(100 - profitMargin).toFixed(0)}% of your money. Check tire pressure, clean your filter, or drive more slowly to save fuel.`,
      });
    } else if (profitMargin >= 60 && stats.totalEarnings > 0) {
      list.push({
        id: 'high_margin',
        type: 'success',
        title: 'Excellent Clear Profits!',
        desc: `You saved ${profitMargin.toFixed(0)}% of your total earnings in your pocket after fuel cost! Very high mileage.`,
      });
    }

    // Minimum ride recommendations based on currently tracked fuel trends
    const thresholdKmCost = (vehicle.fuelPrice / vehicle.mileage);
    const recommendedMinFareRate = thresholdKmCost * 2.5;
    list.push({
      id: 'pricing_tip',
      type: 'info',
      title: 'Suggested Minimum Price Tip',
      desc: `Do not accept any ride offer below ${currency}${recommendedMinFareRate.toFixed(0)} per combined KM.`,
    });

    return list;
  }, [stats, vehicle, currency]);

  // Prepare simple interactive SVG chart of recent rides
  const chartData = useMemo(() => {
    const subset = rides.slice(-8); // Show last 8 rides
    if (subset.length === 0) return [];
    
    return subset.map((ride, idx) => {
      const date = new Date(ride.startTime);
      const label = `${ride.platform} #${idx + 1}`;
      
      return {
        label,
        earnings: ride.earnings,
        fuelCost: ride.fuelCost,
        profit: ride.profit,
        rawDate: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    });
  }, [rides]);

  return (
    <div className="space-y-4" id="dashboard_section">
      
      {/* 6 Simplified Giant Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3" id="stats_overview_grid">
        
        {/* Metric 1: Clear Profit (Actual Profit) */}
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between" id="metric_profit">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wide">Clear Profit</span>
            <div className="p-1.5 bg-green-500/10 text-green-400 rounded-lg">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${stats.totalProfit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
              {stats.totalProfit >= 0 ? '' : '-'}{currency}{Math.abs(stats.totalProfit).toFixed(2)}
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-wider">
              {stats.totalEarnings > 0 
                ? `${((stats.totalProfit / stats.totalEarnings) * 100).toFixed(0)}% profit margin` 
                : 'Money left after fuel'}
            </p>
          </div>
        </div>

        {/* Metric 2: Daily Earnings */}
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between" id="metric_earnings">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wide">Daily Earnings</span>
            <div className="p-1.5 bg-green-500/10 text-green-400 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 tracking-tight">
              {currency}{stats.totalEarnings.toFixed(2)}
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-wider">
              Total cash collected
            </p>
          </div>
        </div>

        {/* Metric 3: Profit Per Hour */}
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between" id="metric_profit_per_hour">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wide">Profit Per Hour</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-450 rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${stats.profitPerHour >= 0 ? 'text-emerald-450 glow-green' : 'text-red-400 glow-red'}`}>
              {currency}{stats.profitPerHour.toFixed(2)}
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-wider">
              Earned for every 1 hour
            </p>
          </div>
        </div>

        {/* Metric 4: Non-Earning KM */}
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between" id="metric_deadkm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wide">Non-Earning KM</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <MapPinOff className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black font-mono text-amber-500 tracking-tight">
              {formatDistance(stats.totalDeadKm)}
            </h3>
            <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase tracking-wider">
              {stats.deadKmPercent.toFixed(0)}% empty driving
            </p>
          </div>
        </div>

        {/* Metric 5: Fuel Cost */}
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between" id="metric_fuel">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wide">Fuel Cost</span>
            <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 tracking-tight">
              {currency}{stats.totalFuelCost.toFixed(2)}
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-wider">
              Spent: {((stats.totalDistanceEverything) / (vehicle.mileage || 1)).toFixed(1)} {vehicle.fuelUnit}
            </p>
          </div>
        </div>

        {/* Metric 6: Waiting / Ride Time */}
        <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col justify-between" id="metric_time">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-zinc-400 uppercase tracking-wide">Waiting / Ride Time</span>
            <div className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black font-mono text-zinc-100 tracking-tight">
              {formatDuration(stats.totalDurationSeconds)}
            </h3>
            <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-wider">
              Total driving duration
            </p>
          </div>
        </div>

      </div>

      {/* Graph and Help coach */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" id="dashboard_details_grid">
        
        {/* Custom simplified SVG Chart Panel */}
        <div className="lg:col-span-7 p-4 bg-zinc-950 border border-zinc-900 rounded-xl space-y-4" id="performance_chart_panel">
          <div>
            <h3 className="text-sm font-black text-zinc-100 uppercase tracking-wide">Profit per Ride Chart</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Showing earnings and fuel expenses of your last {chartData.length} rides</p>
          </div>

          {rides.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 text-center p-4">
              <Fuel className="w-8 h-8 text-zinc-750 font-black" />
              <p className="text-xs font-black text-zinc-400 mt-2">No rides logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-full h-48 bg-zinc-900/40 rounded-xl p-3 border border-zinc-900 flex flex-col justify-between">
                <div className="relative flex-1 flex items-end justify-between px-1 gap-2">
                  {chartData.map((data, idx) => {
                    const highestMetric = Math.max(...chartData.map(d => Math.max(d.earnings, d.fuelCost)));
                    const earnHeight = highestMetric > 0 ? (data.earnings / highestMetric) * 100 : 0;
                    const fuelHeight = highestMetric > 0 ? (data.fuelCost / highestMetric) * 100 : 0;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <div className="flex items-end space-x-1 w-full justify-center h-[80%] max-w-[40px]">
                          {/* Green Bar for Earned Money */}
                          <div 
                            style={{ height: `${Math.max(earnHeight, 4)}%` }} 
                            className="w-2.5 bg-green-500 rounded-t-sm"
                          ></div>
                          {/* Red Bar for Fuel Expense */}
                          <div 
                            style={{ height: `${Math.max(fuelHeight, 4)}%` }} 
                            className="w-2 bg-red-600 rounded-t-sm"
                          ></div>
                        </div>
                        <span className="text-[9px] text-zinc-400 mt-1 font-black uppercase">
                          {data.label.charAt(0)}{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex gap-4 justify-center text-[10px] text-zinc-400 font-black uppercase">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-sm"></span> Money Made
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-red-650 rounded-sm"></span> Fuel Cost
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actionable Helpful Tips Panel */}
        <div className="lg:col-span-5 p-4 bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-900 shadow-md flex flex-col justify-between" id="actionable_insights_panel">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 bg-green-500/10 text-green-400 rounded-md">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-zinc-100 text-sm uppercase">Helpful Tips</h3>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">RideProfit Coach</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1" id="insights_scroller">
              {insights.map(item => (
                <div 
                  key={item.id} 
                  className={`p-3 rounded-lg border ${
                    item.type === 'warning' 
                      ? 'bg-amber-500/5 border-amber-500/30 text-amber-250' 
                      : item.type === 'success' 
                        ? 'bg-green-500/5 border-green-500/30 text-green-250' 
                        : 'bg-zinc-900 border-zinc-850 text-zinc-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />}
                    {item.type === 'info' && <TrendingUp className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />}
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide">{item.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-900 pt-3 mt-4 text-xs font-black uppercase tracking-wider text-zinc-500 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Vehicle Profile:</span>
              <span className="text-zinc-300">{vehicle.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Fuel Price:</span>
              <span className="text-green-400">{currency}{vehicle.fuelPrice.toFixed(2)} / {vehicle.fuelUnit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
