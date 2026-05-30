import React, { useMemo } from 'react';
import { Ride, VehicleConfig } from '../types';
import { formatDistance } from '../utils/geo';
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
    const averageEarningsPerRide = rides.length > 0 ? totalEarnings / rides.length : 0;
    const averageProfitPerRide = rides.length > 0 ? totalProfit / rides.length : 0;
    
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

    return {
      totalEarnings,
      totalDistanceSecured,
      totalDeadKm,
      totalDistanceEverything,
      totalFuelCost,
      totalProfit,
      totalDurationSeconds,
      averageEarningsPerRide,
      averageProfitPerRide,
      deadKmPercent,
      revPerKm,
      costPerKm,
      profitPerKm,
      ridesCount: rides.length
    };
  }, [rides]);

  // Insights computation
  const insights = useMemo(() => {
    const list: Array<{ id: string; type: 'success' | 'warning' | 'info'; title: string; desc: string }> = [];

    if (stats.ridesCount === 0) {
      list.push({
        id: 'no_data',
        type: 'info',
        title: 'Welcome to RideProfit!',
        desc: 'Start your first ride tracking session or add a quick manual log below to see automated financial diagnostics.',
      });
      return list;
    }

    // Dead KM Check
    if (stats.deadKmPercent > 25) {
      list.push({
        id: 'high_dead_km',
        type: 'warning',
        title: 'High Dead Mileage Alert',
        desc: `${stats.deadKmPercent.toFixed(1)}% of your driving is unpaid dead kilometers. Park at designated terminals rather than cruising empty.`,
      });
    } else if (stats.deadKmPercent > 0) {
      list.push({
        id: 'low_dead_km',
        type: 'success',
        title: 'Excellent Cabin Efficiency',
        desc: `Unpaid cruising is only ${stats.deadKmPercent.toFixed(1)}%. You are doing a highly optimized pick-up strategy.`,
      });
    }

    // Profit margin check
    const profitMargin = stats.totalEarnings > 0 ? (stats.totalProfit / stats.totalEarnings) * 100 : 0;
    if (profitMargin < 40 && stats.totalEarnings > 0) {
      list.push({
        id: 'low_margin',
        type: 'warning',
        title: 'Squeezed Profit Margin',
        desc: `Your fuel expense is consuming ${(100 - profitMargin).toFixed(1)}% of total earnings. Verify tire pressures or inspect vehicle mileage stats.`,
      });
    } else if (profitMargin >= 65 && stats.totalEarnings > 0) {
      list.push({
        id: 'high_margin',
        type: 'success',
        title: 'Highly Lucrative Sessions',
        desc: `Profit margins are outstanding at ${profitMargin.toFixed(0)}%. Highly efficient vehicle operations!`,
      });
    }

    // Minimum ride recommendations based on currently tracked fuel trends
    const thresholdKmCost = (vehicle.fuelPrice / vehicle.mileage);
    const recommendedMinFareRate = thresholdKmCost * 2.5;
    list.push({
      id: 'pricing_tip',
      type: 'info',
      title: 'Suggested Minimum Fare Pricing',
      desc: `To maintain healthy earnings, reject fares below ${currency}${recommendedMinFareRate.toFixed(2)} per combined km (active + estimated dead km).`,
    });

    return list;
  }, [stats, vehicle, currency]);

  // Prepare simple interactive SVG chart of recent rides
  const chartData = useMemo(() => {
    const subset = rides.slice(-8); // Show last 8 rides
    if (subset.length === 0) return [];
    
    const maxVal = Math.max(...subset.map(r => Math.max(r.earnings, r.fuelCost, r.profit, 5)));
    
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
    <div className="space-y-6" id="dashboard_section">
      {/* 4 Core Driver Stats Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="stats_overview_grid">
        {/* Metric 1: Profit */}
        <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex flex-col justify-between" id="metric_profit">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Net Profit</span>
            <div className="p-1.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${stats.totalProfit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
              {stats.totalProfit >= 0 ? '' : '-'}{currency}{Math.abs(stats.totalProfit).toFixed(2)}
            </h3>
            <p className="text-[10px] font-medium text-zinc-500 mt-1 uppercase tracking-wider">
              {stats.totalEarnings > 0 
                ? `${((stats.totalProfit / stats.totalEarnings) * 100).toFixed(0)}% profit margin` 
                : 'Earnings less fuel cost'}
            </p>
          </div>
        </div>

        {/* Metric 2: Total Completed Rides */}
        <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex flex-col justify-between" id="metric_rides">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Rides Completed</span>
            <div className="p-1.5 bg-green-500/10 text-green-400 rounded-lg border border-green-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-zinc-100 tracking-tight">
              {stats.ridesCount}
            </h3>
            <p className="text-[10px] font-medium text-zinc-500 mt-1 uppercase tracking-wider">
              Across logged runs
            </p>
          </div>
        </div>

        {/* Metric 3: Dead Kilometers */}
        <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex flex-col justify-between" id="metric_deadkm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Dead Distance</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <MapPinOff className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-zinc-100 tracking-tight">
              {formatDistance(stats.totalDeadKm)}
            </h3>
            <p className="text-[10px] font-medium text-amber-400 mt-1 uppercase tracking-wider">
              {stats.deadKmPercent.toFixed(1)}% unpaid driving
            </p>
          </div>
        </div>

        {/* Metric 4: Fuel Cost */}
        <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex flex-col justify-between" id="metric_fuel">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Est. Fuel Cost</span>
            <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-mono text-zinc-100 tracking-tight">
              {currency}{stats.totalFuelCost.toFixed(2)}
            </h3>
            <p className="text-[10px] font-medium text-zinc-500 mt-1 uppercase tracking-wider">
              Consumed: {((stats.totalDistanceEverything) / (vehicle.mileage || 1)).toFixed(2)} {vehicle.fuelUnit}
            </p>
          </div>
        </div>
      </div>

      {/* Secondary insights / mini layout specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard_details_grid">
        
        {/* Dynamic Diagnostics (Aesthetic SVG Visuals and analysis) */}
        <div className="lg:col-span-8 p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-6" id="performance_chart_panel">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-extrabold text-zinc-100 uppercase tracking-wider">Financial Diagnostics Ledger</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Comparing gross profit and fuel depletion across recent ride sessions</p>
            </div>
            {rides.length > 0 && (
              <span className="text-[10px] bg-green-500/10 border border-green-500/25 text-green-400 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3" /> Last {chartData.length} Runs
              </span>
            )}
          </div>

          {rides.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl space-y-3 bg-zinc-900/20 p-6 text-center">
              <Fuel className="w-10 h-10 text-zinc-750 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-zinc-300">No session metrics available</p>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">Start your live run under the Ride Tracker tab to log diagnostics automatically.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Custom SVG Rendered Graph to stay bundle-safe, React 19 stable, and highly responsive */}
              <div className="w-full h-56 pt-2 bg-zinc-950/80 rounded-xl p-3 border border-zinc-800/80 flex flex-col justify-between">
                <div className="relative flex-1 flex items-end justify-between px-2 gap-4">
                  {/* Grid background lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 py-2">
                    <div className="border-b border-zinc-800 w-full"></div>
                    <div className="border-b border-zinc-800 w-full"></div>
                    <div className="border-b border-zinc-800 w-full"></div>
                    <div className="border-b border-zinc-800 w-full"></div>
                  </div>

                  {chartData.map((data, idx) => {
                    // Normalize bar heights
                    const highestMetric = Math.max(...chartData.map(d => Math.max(d.earnings, d.fuelCost)));
                    const earnHeight = highestMetric > 0 ? (data.earnings / highestMetric) * 100 : 0;
                    const fuelHeight = highestMetric > 0 ? (data.fuelCost / highestMetric) * 100 : 0;
                    const netProfit = data.earnings - data.fuelCost;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group z-10">
                        {/* Tooltip Overlay */}
                        <div className="opacity-0 group-hover:opacity-100 transition-all absolute bottom-28 bg-zinc-900 text-zinc-100 text-[10px] rounded-lg p-2.5 shadow-2xl border border-zinc-700 pointer-events-none z-20 space-y-1 w-32">
                          <p className="font-bold border-b border-zinc-800 pb-1 text-zinc-300 text-[9px] uppercase tracking-wider">{data.label}</p>
                          <p className="flex justify-between">Gross: <span className="font-bold text-green-400">{currency}{data.earnings.toFixed(1)}</span></p>
                          <p className="flex justify-between">Fuel: <span className="font-bold text-red-400">{currency}{data.fuelCost.toFixed(1)}</span></p>
                          <p className="flex justify-between border-t border-zinc-800 pt-1 font-bold">Profit: <span className={netProfit >= 0 ? "text-green-400" : "text-rose-400"}>{currency}{netProfit.toFixed(1)}</span></p>
                        </div>

                        {/* Bar Pairs Container */}
                        <div className="flex items-end space-x-1 sm:space-x-1.5 w-full justify-center h-[80%] max-w-[48px]">
                          {/* Earnings Bar */}
                          <div 
                            style={{ height: `${Math.max(earnHeight, 4)}%` }} 
                            className="w-2 bg-green-500 rounded-t-sm transition-all duration-300 group-hover:bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.25)]"
                          ></div>
                          {/* Fuel Cost Bar */}
                          <div 
                            style={{ height: `${Math.max(fuelHeight, 4)}%` }} 
                            className="w-2 bg-zinc-700 rounded-t-sm transition-all duration-300 group-hover:bg-zinc-600"
                          ></div>
                        </div>

                        {/* X-Axis labels */}
                        <span className="text-[9px] text-zinc-400 mt-2 truncate w-full text-center tracking-tight font-black uppercase">
                          {data.label.replace('Uber', 'U').replace('Ola', 'O').replace('Rapido', 'R').replace('Yandex', 'Y').replace('Custom', 'C')}
                        </span>
                        <span className="text-[8px] text-zinc-500 font-mono">
                          {data.rawDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex gap-4 justify-center text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-sm"></span> Gross Earnings
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-zinc-700 rounded-sm"></span> Fuel Consumed
                </span>
                <span className="text-zinc-500 italic lowercase font-normal">
                  (hover metrics for dynamic tooltips)
                </span>
              </div>
            </div>
          )}

          {/* Table Metrics: Segment Level efficiency analytics */}
          <div className="border-t border-zinc-800/80 pt-4" id="efficiency_ratios">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CirclePercent className="w-4 h-4 text-green-400" /> Operational Efficiency Indicators
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Revenue Yield</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold font-mono text-zinc-100">{currency}{stats.revPerKm.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500">/ km</span>
                </div>
                <p className="text-[9px] text-zinc-500 mt-1 leading-normal">Combined revenue logged per kilometer</p>
              </div>

              <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Fuel depletion cost</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold font-mono text-red-400">{currency}{stats.costPerKm.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500">/ km</span>
                </div>
                <p className="text-[9px] text-zinc-500 mt-1 leading-normal">Estimated fuel cost per kilometer</p>
              </div>

              <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/60">
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Net yield margin</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold font-mono text-green-400 glow-green">{currency}{stats.profitPerKm.toFixed(2)}</span>
                  <span className="text-[10px] text-zinc-500">/ km</span>
                </div>
                <p className="text-[9px] text-zinc-500 mt-1 leading-normal">Net profit rate across run intervals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actionable Insights Panel */}
        <div className="lg:col-span-4 p-6 bg-zinc-900/60 text-zinc-100 rounded-xl border border-zinc-800/80 shadow-md flex flex-col justify-between" id="actionable_insights_panel">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-green-500/10 text-green-400 rounded-md border border-green-500/20">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-zinc-100 text-xs uppercase tracking-widest">RideProfit Coach</h3>
                <p className="text-[9px] text-zinc-400 uppercase tracking-widest mt-0.5 font-bold">Autonomous analysis</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1" id="insights_scroller">
              {insights.map(item => (
                <div 
                  key={item.id} 
                  className={`p-3.5 rounded-xl border ${
                    item.type === 'warning' 
                      ? 'bg-amber-500/5 border-amber-500/20 text-amber-200' 
                      : item.type === 'success' 
                        ? 'bg-green-500/5 border-green-500/20 text-green-200 shadow-[0_0_15px_rgba(34,197,94,0.02)]' 
                        : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />}
                    {item.type === 'info' && <TrendingUp className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">{item.title}</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 mt-6">
            <div className="flex items-center justify-between text-xs text-zinc-450 uppercase tracking-wider font-bold">
              <span>Vehicle Profile</span>
              <span className="font-mono text-zinc-300 font-black">{vehicle.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-450 uppercase tracking-wider font-bold mt-2.5">
              <span>Current Mileage</span>
              <span className="font-mono text-zinc-300 font-extrabold">{vehicle.mileage} km/{vehicle.fuelUnit}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-450 uppercase tracking-wider font-bold mt-2.5">
              <span>Fuel Price Point</span>
              <span className="font-mono text-green-400 font-extrabold">{currency}{vehicle.fuelPrice.toFixed(2)}/{vehicle.fuelUnit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
