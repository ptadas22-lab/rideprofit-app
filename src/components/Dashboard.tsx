import React, { useMemo, useState } from 'react';
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
  CheckCircle2,
  Clock,
  Package,
  Activity,
  Route,
  Gauge,
  User,
  Navigation
} from 'lucide-react';

interface DashboardProps {
  rides: Ride[];
  vehicle: VehicleConfig;
  currency: string;
}

export default function Dashboard({ rides, vehicle, currency }: DashboardProps) {
  const [platform] = useState<Ride['platform']>(() => {
    return (localStorage.getItem('rideprofit_active_platform') as Ride['platform']) || 'Cab Ride';
  });

  // Compute overall stats
  const stats = useMemo(() => {
    let totalEarnings = 0;
    let totalDistanceSecured = 0;
    let totalDeadKm = 0;
    let totalFuelCost = 0;
    let totalDurationSeconds = 0;
    let totalWaitingTime = 0;
    let totalTripExpense = 0;

    rides.forEach(ride => {
      totalEarnings += ride.earnings;
      totalDistanceSecured += ride.distanceKm;
      totalDeadKm += ride.deadKm;
      totalFuelCost += ride.fuelCost;
      totalDurationSeconds += ride.durationSeconds;
      if (ride.dynamicFields?.waitingTimeMins) totalWaitingTime += Number(ride.dynamicFields.waitingTimeMins);
      if (ride.dynamicFields?.tripExpense) totalTripExpense += Number(ride.dynamicFields.tripExpense);
    });

    const totalDistanceEverything = totalDistanceSecured + totalDeadKm;
    const totalProfit = totalEarnings - totalFuelCost;
    
    const deadKmPercent = totalDistanceEverything > 0 
      ? (totalDeadKm / totalDistanceEverything) * 100 
      : 0;

    const revPerKm = totalDistanceEverything > 0 ? totalEarnings / totalDistanceEverything : 0;
    const costPerKm = totalDistanceEverything > 0 ? totalFuelCost / totalDistanceEverything : 0;
    const profitPerKm = revPerKm - costPerKm;

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
      ridesCount: rides.length,
      totalWaitingTime,
      totalTripExpense
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
        desc: 'Go to the "Start Ride" tab to log your first ride and see how much profit you made!',
      });
      return list;
    }

    if (platform === 'Cab Ride') {
      if (stats.deadKmPercent > 25) {
        list.push({ id: 'cab_1', type: 'warning', title: 'High Non-Earning KM Alert', desc: `You drove ${stats.deadKmPercent.toFixed(0)}% of your distance empty. Try parking in crowded areas instead of driving around.` });
      } else if (stats.deadKmPercent > 0) {
        list.push({ id: 'cab_2', type: 'success', title: 'Excellent Driving Strategy!', desc: `You only drove ${stats.deadKmPercent.toFixed(0)}% empty. Very good job of finding customer rides quickly!` });
      }
      const profitMargin = stats.totalEarnings > 0 ? (stats.totalProfit / stats.totalEarnings) * 100 : 0;
      if (profitMargin < 40 && stats.totalEarnings > 0) {
        list.push({ id: 'cab_3', type: 'warning', title: 'High Fuel Expense Warning', desc: `Fuel took away ${(100 - profitMargin).toFixed(0)}% of your money. Check tire pressure, clean your filter, or drive more slowly to save fuel.` });
      } else if (profitMargin >= 60 && stats.totalEarnings > 0) {
        list.push({ id: 'cab_4', type: 'success', title: 'Excellent Clear Profits!', desc: `You saved ${profitMargin.toFixed(0)}% of your total earnings in your pocket after fuel cost! Very high mileage.` });
      }
      const thresholdKmCost = (vehicle.fuelPrice / vehicle.mileage);
      const recommendedMinFareRate = thresholdKmCost * 2.5;
      list.push({ id: 'cab_5', type: 'info', title: 'Suggested Minimum Price Tip', desc: `Do not accept any ride offer below ${currency}${recommendedMinFareRate.toFixed(0)} per combined KM.` });
    } else if (platform === 'Auto Ride') {
      list.push({ id: 'auto_1', type: 'warning', title: 'Reduce idle waiting', desc: 'Avoid waiting too long without a passenger to maximize earnings.' });
      list.push({ id: 'auto_2', type: 'info', title: 'Better stand selection', desc: 'Choose auto stands with higher footfall during peak hours.' });
      list.push({ id: 'auto_3', type: 'success', title: 'Fuel efficiency', desc: 'Turn off engine at long traffic lights to save fuel.' });
      list.push({ id: 'auto_4', type: 'success', title: 'CNG savings', desc: 'CNG provides better mileage. Keep track of your nearest CNG stations.' });
    } else if (platform === 'Bike Ride') {
      list.push({ id: 'bike_1', type: 'success', title: 'Increase completed rides', desc: 'More short trips can add up to higher daily earnings.' });
      list.push({ id: 'bike_2', type: 'warning', title: 'Reduce idle time', desc: 'Keep moving towards high-demand areas instead of waiting.' });
      list.push({ id: 'bike_3', type: 'info', title: 'Peak hour recommendations', desc: 'Ride during office hours for maximum requests.' });
      list.push({ id: 'bike_4', type: 'success', title: 'Fuel efficiency', desc: 'Maintain steady speed and correct tire pressure.' });
    } else if (platform === 'Delivery Ride') {
      list.push({ id: 'del_1', type: 'success', title: 'Delivery efficiency', desc: 'Batch multiple orders if your app allows it.' });
      list.push({ id: 'del_2', type: 'info', title: 'Pickup optimization', desc: 'Park near restaurant clusters to reduce pickup time.' });
      list.push({ id: 'del_3', type: 'warning', title: 'Reduce waiting', desc: 'Avoid areas known for slow restaurant preparation.' });
      list.push({ id: 'del_4', type: 'success', title: 'Route optimization', desc: 'Use optimal navigation to cut down dead kilometers.' });
    } else if (platform === 'Personal') {
      list.push({ id: 'pers_1', type: 'success', title: 'Smooth driving', desc: 'Avoid sudden braking and acceleration to save fuel.' });
      list.push({ id: 'pers_2', type: 'success', title: 'Fuel saving', desc: 'Use AC optimally and maintain cruising speed on highways.' });
      list.push({ id: 'pers_3', type: 'info', title: 'Maintenance reminders', desc: 'Regularly check engine health and oil levels.' });
      list.push({ id: 'pers_4', type: 'warning', title: 'Tire pressure', desc: 'Low tire pressure decreases mileage significantly.' });
      list.push({ id: 'pers_5', type: 'info', title: 'Engine health', desc: 'Ensure timely servicing for prolonged engine life.' });
    } else {
      list.push({ id: 'def_1', type: 'info', title: 'Keep driving!', desc: 'Log more rides to see insights.' });
    }

    return list;
  }, [stats, vehicle, currency, platform]);

  const chartData = useMemo(() => {
    const subset = rides.slice(-8); 
    if (subset.length === 0) return [];
    
    return subset.map((ride, idx) => {
      const date = new Date(ride.startTime);
      const label = `${ride.platform} #${idx + 1}`;
      
      return {
        label,
        earnings: ride.earnings,
        fuelCost: ride.fuelCost,
        profit: ride.profit,
        distance: ride.distanceKm + ride.deadKm,
        waitingTime: Number(ride.dynamicFields?.waitingTimeMins) || 0,
        orders: Number(ride.dynamicFields?.ordersCompleted) || 1,
        rawDate: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    });
  }, [rides]);

  return (
    <div className="space-y-4" id="dashboard_section">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4" id="stats_overview_grid">
        
        {/* Metric 1 */}
        <div className="p-5 bg-gray-700 border border-white/10 rounded-[18px] flex flex-col justify-between shadow-md transition-transform hover:scale-[1.02]" id="metric_profit">
          {platform === 'Personal' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Total Distance</span>
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Route className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono tracking-tight text-blue-400 leading-none">
                  {formatDistance(stats.totalDistanceEverything)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Total Driven
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Clear Profit</span>
                <div className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                  <PiggyBank className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className={`text-[32px] font-black font-mono tracking-tight leading-none ${stats.totalProfit >= 0 ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
                  {stats.totalProfit >= 0 ? '' : '-'}{currency}{Math.abs(stats.totalProfit).toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  {stats.totalEarnings > 0 
                    ? `${((stats.totalProfit / stats.totalEarnings) * 100).toFixed(0)}% profit margin` 
                    : 'Money left after fuel'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Metric 2 */}
        <div className="p-5 bg-gray-700 border border-white/10 rounded-[18px] flex flex-col justify-between shadow-md transition-transform hover:scale-[1.02]" id="metric_earnings">
          {platform === 'Personal' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Fuel Cost</span>
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                  <Fuel className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-white tracking-tight leading-none">
                  {currency}{stats.totalFuelCost.toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Spent: {((stats.totalDistanceEverything) / (vehicle.mileage || 1)).toFixed(1)} {vehicle.fuelUnit}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Daily Earnings</span>
                <div className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-white tracking-tight leading-none">
                  {currency}{stats.totalEarnings.toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Total cash collected
                </p>
              </div>
            </>
          )}
        </div>

        {/* Metric 3 */}
        <div className="p-5 bg-gray-700 border border-white/10 rounded-[18px] flex flex-col justify-between shadow-md transition-transform hover:scale-[1.02]" id="metric_profit_per_hour">
          {platform === 'Personal' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Trip Expense</span>
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                  <PiggyBank className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono tracking-tight text-purple-400 leading-none">
                  {currency}{stats.totalTripExpense.toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Total expenses
                </p>
              </div>
            </>
          ) : platform === 'Delivery Ride' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Orders Completed</span>
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono tracking-tight text-white leading-none">
                  {stats.ridesCount}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Total orders
                </p>
              </div>
            </>
          ) : platform === 'Bike Ride' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Profit Per Order</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className={`text-[32px] font-black font-mono tracking-tight leading-none ${(stats.totalProfit / (stats.ridesCount || 1)) >= 0 ? 'text-emerald-400 glow-green' : 'text-red-400 glow-red'}`}>
                  {currency}{(stats.totalProfit / (stats.ridesCount || 1)).toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Average per order
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Profit Per Hour</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className={`text-[32px] font-black font-mono tracking-tight leading-none ${stats.profitPerHour >= 0 ? 'text-emerald-400 glow-green' : 'text-red-400 glow-red'}`}>
                  {currency}{stats.profitPerHour.toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Earned for every 1 hour
                </p>
              </div>
            </>
          )}
        </div>

        {/* Metric 4 */}
        <div className="p-5 bg-gray-700 border border-white/10 rounded-[18px] flex flex-col justify-between shadow-md transition-transform hover:scale-[1.02]" id="metric_deadkm">
          {platform === 'Personal' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Drive Time</span>
                <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-white tracking-tight leading-none">
                  {formatDuration(stats.totalDurationSeconds)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Total driving duration
                </p>
              </div>
            </>
          ) : platform === 'Delivery Ride' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Avg Earn / Order</span>
                <div className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-white tracking-tight leading-none">
                  {currency}{(stats.totalEarnings / (stats.ridesCount || 1)).toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Per order average
                </p>
              </div>
            </>
          ) : platform === 'Bike Ride' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Orders Completed</span>
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Package className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono tracking-tight text-white leading-none">
                  {stats.ridesCount}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Total orders
                </p>
              </div>
            </>
          ) : platform === 'Auto Ride' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Waiting Time</span>
                <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-yellow-400 tracking-tight leading-none">
                  {stats.totalWaitingTime} <span className="text-xl">mins</span>
                </h3>
                <p className="text-[12px] font-bold text-yellow-500 mt-1.5 uppercase tracking-wider">
                  Total idle waiting
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Non-Earning KM</span>
                <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-xl">
                  <MapPinOff className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-yellow-400 tracking-tight leading-none">
                  {formatDistance(stats.totalDeadKm)}
                </h3>
                <p className="text-[12px] font-bold text-yellow-500 mt-1.5 uppercase tracking-wider">
                  {stats.deadKmPercent.toFixed(0)}% empty driving
                </p>
              </div>
            </>
          )}
        </div>

        {/* Metric 5 */}
        <div className="p-5 bg-gray-700 border border-white/10 rounded-[18px] flex flex-col justify-between shadow-md transition-transform hover:scale-[1.02]" id="metric_fuel">
          {platform === 'Personal' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Average Mileage</span>
                <div className="p-2 bg-green-500/10 text-green-400 rounded-xl">
                  <Gauge className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-white tracking-tight leading-none">
                  {vehicle.mileage}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  KM per {vehicle.fuelUnit}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Fuel Cost</span>
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                  <Fuel className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-white tracking-tight leading-none">
                  {currency}{stats.totalFuelCost.toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Spent: {((stats.totalDistanceEverything) / (vehicle.mileage || 1)).toFixed(1)} {vehicle.fuelUnit}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Metric 6 */}
        <div className="p-5 bg-gray-700 border border-white/10 rounded-[18px] flex flex-col justify-between shadow-md transition-transform hover:scale-[1.02]" id="metric_time">
          {platform === 'Personal' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Cost Per KM</span>
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-red-400 tracking-tight leading-none">
                  {currency}{stats.costPerKm.toFixed(2)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Running cost
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-black text-gray-400 uppercase tracking-wide">Ride Time</span>
                <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-xl">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-[32px] font-black font-mono text-white tracking-tight leading-none">
                  {formatDuration(stats.totalDurationSeconds)}
                </h3>
                <p className="text-[12px] font-bold text-gray-500 mt-1.5 uppercase tracking-wider">
                  Total driving duration
                </p>
              </div>
            </>
          )}
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="dashboard_details_grid">
        
        {/* Custom simplified SVG Chart Panel */}
        <div className="lg:col-span-7 p-6 bg-gray-700 border border-white/10 rounded-[20px] space-y-4 shadow-md" id="performance_chart_panel">
          <div>
            <h3 className="text-[16px] font-black text-white uppercase tracking-wide">
              {platform === 'Cab Ride' ? 'Profit vs Fuel' : 
               platform === 'Auto Ride' ? 'Profit vs Waiting Time' :
               platform === 'Bike Ride' ? 'Orders vs Earnings' :
               platform === 'Delivery Ride' ? 'Orders vs Earnings' :
               platform === 'Personal' ? 'Distance vs Fuel Cost' : 'Profit per Ride'} Chart
            </h3>
            <p className="text-[13px] text-gray-400 mt-1">Showing performance of your last {chartData.length} rides</p>
          </div>

          {rides.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center border-[3px] border-dashed border-gray-600 rounded-xl bg-gray-800/40 text-center p-4">
              <Fuel className="w-10 h-10 text-gray-600 font-black" />
              <p className="text-[14px] font-black text-gray-400 mt-2">No rides logged yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-full h-56 bg-gray-800/50 rounded-[16px] p-4 border border-white/5 flex flex-col justify-between">
                <div className="relative flex-1 flex items-end justify-between px-2 gap-3">
                  {chartData.map((data, idx) => {
                    let metric1 = 0;
                    let metric2 = 0;
                    if (platform === 'Cab Ride') {
                      metric1 = data.profit;
                      metric2 = data.fuelCost;
                    } else if (platform === 'Auto Ride') {
                      metric1 = data.profit;
                      metric2 = data.waitingTime;
                    } else if (platform === 'Bike Ride' || platform === 'Delivery Ride') {
                      metric1 = data.orders;
                      metric2 = data.earnings;
                    } else if (platform === 'Personal') {
                      metric1 = data.distance;
                      metric2 = data.fuelCost;
                    } else {
                      metric1 = data.profit;
                      metric2 = data.fuelCost;
                    }

                    const maxMetric1 = Math.max(...chartData.map(d => {
                      if (platform === 'Cab Ride') return d.profit;
                      if (platform === 'Auto Ride') return d.profit;
                      if (platform === 'Bike Ride' || platform === 'Delivery Ride') return d.orders;
                      if (platform === 'Personal') return d.distance;
                      return d.profit;
                    }));
                    
                    const maxMetric2 = Math.max(...chartData.map(d => {
                      if (platform === 'Cab Ride') return d.fuelCost;
                      if (platform === 'Auto Ride') return d.waitingTime;
                      if (platform === 'Bike Ride' || platform === 'Delivery Ride') return d.earnings;
                      if (platform === 'Personal') return d.fuelCost;
                      return d.fuelCost;
                    }));

                    const highestMetric = Math.max(maxMetric1, maxMetric2, 1);
                    const height1 = (metric1 / highestMetric) * 100;
                    const height2 = (metric2 / highestMetric) * 100;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <div className="flex items-end space-x-1.5 w-full justify-center h-[85%] max-w-[45px]">
                          <div 
                            style={{ height: `${Math.max(height1, 4)}%` }} 
                            className="w-3 bg-green-500 rounded-t-sm"
                          ></div>
                          <div 
                            style={{ height: `${Math.max(height2, 4)}%` }} 
                            className="w-3 bg-red-500 rounded-t-sm"
                          ></div>
                        </div>
                        <span className="text-[11px] text-gray-400 mt-1 font-black uppercase">
                          {data.label.charAt(0)}{idx + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex gap-5 justify-center text-[12px] text-gray-400 font-black uppercase mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-green-500 rounded-sm"></span> 
                  {platform === 'Cab Ride' ? 'Profit' :
                   platform === 'Auto Ride' ? 'Profit' :
                   platform === 'Bike Ride' ? 'Orders' :
                   platform === 'Delivery Ride' ? 'Orders' :
                   platform === 'Personal' ? 'Distance' : 'Profit'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-red-500 rounded-sm"></span> 
                  {platform === 'Cab Ride' ? 'Fuel Cost' :
                   platform === 'Auto Ride' ? 'Waiting Time' :
                   platform === 'Bike Ride' ? 'Earnings' :
                   platform === 'Delivery Ride' ? 'Earnings' :
                   platform === 'Personal' ? 'Fuel Cost' : 'Fuel Cost'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actionable Helpful Tips Panel */}
        <div className="lg:col-span-5 p-6 bg-gray-700 text-white rounded-[20px] border border-white/10 shadow-md flex flex-col justify-between" id="actionable_insights_panel">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 text-green-400 rounded-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-[16px] text-white uppercase">Helpful Tips</h3>
                <p className="text-[11px] text-gray-400 uppercase tracking-widest font-black">RideProfit Coach</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar" id="insights_scroller">
              {insights.map(item => (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-[14px] border transition-colors ${
                    item.type === 'warning' 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' 
                      : item.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-200' 
                        : 'bg-gray-800 border-white/5 text-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {item.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                    {item.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />}
                    {item.type === 'info' && <TrendingUp className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />}
                    <div>
                      <h4 className="text-[13px] font-black uppercase tracking-wide">{item.title}</h4>
                      <p className="text-[13px] text-gray-400 mt-1 leading-relaxed opacity-90">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 mt-5 text-[12px] font-black uppercase tracking-wider text-gray-500 space-y-2">
            <div className="flex items-center justify-between">
              <span>Vehicle Profile:</span>
              <span className="text-gray-300">
                {platform === 'Cab Ride' ? 'Commercial Car' :
                 platform === 'Auto Ride' ? 'Auto Rickshaw' :
                 platform === 'Bike Ride' ? 'Motorcycle' :
                 platform === 'Delivery Ride' ? 'Scooter / Bike' :
                 platform === 'Personal' ? 'Private Vehicle' : vehicle.name}
              </span>
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
