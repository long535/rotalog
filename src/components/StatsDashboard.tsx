import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subMonths, addMonths, subYears, addYears, subWeeks, addWeeks, getDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, TrendingUp, Clock, DollarSign, Palmtree, Stethoscope, Briefcase, Zap, BarChart3, Award } from 'lucide-react';
import { Shift, AppSettings, Job } from '../types';
import { calculateWages, calculateAnnualLeaveHours, formatCurrency, getShiftPaidHours } from '../utils';
import { useTranslation } from '../i18n';
import { haptic } from '../haptics';

type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

interface Props {
  shifts: Shift[];
  settings: AppSettings;
  jobs: Job[];
}

// ─── Utility: group shifts into buckets for bar chart ───
function groupShiftsByDay(shifts: Shift[], start: Date, end: Date) {
  const days = eachDayOfInterval({ start, end });
  return days.map(day => {
    const dayShifts = shifts.filter(s => isSameDay(parseISO(s.startTime), day));
    return { label: format(day, 'EEE'), fullLabel: format(day, 'MMM d'), shifts: dayShifts };
  });
}

function groupShiftsByWeek(shifts: Shift[], start: Date, end: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1) {
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn });
  return weeks.map((weekStart, i) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn });
    const weekShifts = shifts.filter(s => {
      const d = parseISO(s.startTime);
      return d >= weekStart && d <= weekEnd;
    });
    return { label: `W${i + 1}`, fullLabel: `${format(weekStart, 'MMM d')}–${format(weekEnd, 'MMM d')}`, shifts: weekShifts };
  });
}

function groupShiftsByMonth(shifts: Shift[], start: Date, end: Date) {
  const months = eachMonthOfInterval({ start, end });
  return months.map(monthStart => {
    const monthEnd = endOfMonth(monthStart);
    const monthShifts = shifts.filter(s => {
      const d = parseISO(s.startTime);
      return d >= monthStart && d <= monthEnd;
    });
    return { label: format(monthStart, 'MMM'), fullLabel: format(monthStart, 'MMMM yyyy'), shifts: monthShifts };
  });
}

// ─── Pure SVG Bar Chart ───
interface BarData {
  label: string;
  fullLabel: string;
  regular: number;
  annualLeave: number;
  sickLeave: number;
  overtime: number;
  total: number;
  earnings: number;
}

function BarChart({ data, mode, currency, isDark }: { data: BarData[]; mode: 'hours' | 'earnings'; currency: string; isDark: boolean }) {
  const [activeBar, setActiveBar] = useState<number | null>(null);

  const values = data.map(d => mode === 'hours' ? d.total : d.earnings);
  const maxVal = Math.max(...values, 1);
  const barWidth = Math.max(16, Math.min(40, (300 - data.length * 4) / data.length));
  const chartHeight = 160;
  const chartWidth = data.length * (barWidth + 8) + 20;

  return (
    <div className="relative">
      {/* Tooltip */}
      {activeBar !== null && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10 whitespace-nowrap">
          <div className="font-semibold">{data[activeBar].fullLabel}</div>
          {mode === 'hours' ? (
            <>
              <div>Regular: {data[activeBar].regular.toFixed(1)}h</div>
              {data[activeBar].annualLeave > 0 && <div className="text-purple-300">Annual Leave: {data[activeBar].annualLeave.toFixed(1)}h</div>}
              {data[activeBar].sickLeave > 0 && <div className="text-red-300">Sick Leave: {data[activeBar].sickLeave.toFixed(1)}h</div>}
              {data[activeBar].overtime > 0 && <div className="text-orange-300">Overtime: {data[activeBar].overtime.toFixed(1)}h</div>}
              <div className="font-bold border-t border-slate-600 mt-1 pt-1">Total: {data[activeBar].total.toFixed(1)}h</div>
            </>
          ) : (
            <div className="font-bold">{formatCurrency(data[activeBar].earnings, currency)}</div>
          )}
        </div>
      )}

      <div className="overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        <svg width={Math.max(chartWidth, 300)} height={chartHeight + 30} className="mx-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <g key={i}>
              <line
                x1={10} y1={chartHeight * (1 - pct) + 5}
                x2={chartWidth - 10} y2={chartHeight * (1 - pct) + 5}
                stroke={isDark ? '#374151' : '#e2e8f0'} strokeWidth={1}
              />
              <text
                x={5} y={chartHeight * (1 - pct) + 9}
                fontSize={8} fill={isDark ? '#6b7280' : '#94a3b8'} textAnchor="start"
              >
                {mode === 'hours' ? `${(maxVal * pct).toFixed(0)}h` : formatCurrency(maxVal * pct, currency)}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const x = 15 + i * (barWidth + 8);
            const val = mode === 'hours' ? d.total : d.earnings;
            const barH = (val / maxVal) * chartHeight;

            if (mode === 'earnings') {
              return (
                <g key={i}
                  onMouseEnter={() => setActiveBar(i)}
                  onMouseLeave={() => setActiveBar(null)}
                  onClick={() => setActiveBar(activeBar === i ? null : i)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={x} y={chartHeight - barH + 5}
                    width={barWidth} height={Math.max(barH, 1)}
                    rx={4} fill="url(#greenGrad)"
                    className="transition-all duration-300"
                    opacity={activeBar === null || activeBar === i ? 1 : 0.4}
                  />
                  <text x={x + barWidth / 2} y={chartHeight + 20} fontSize={9}
                    fill={isDark ? '#9ca3af' : '#64748b'} textAnchor="middle">{d.label}</text>
                </g>
              );
            }

            // Stacked bar for hours
            const regularH = (d.regular / maxVal) * chartHeight;
            const annualH = (d.annualLeave / maxVal) * chartHeight;
            const sickH = (d.sickLeave / maxVal) * chartHeight;
            const overtimeH = (d.overtime / maxVal) * chartHeight;
            let yOffset = chartHeight + 5;

            return (
              <g key={i}
                onMouseEnter={() => setActiveBar(i)}
                onMouseLeave={() => setActiveBar(null)}
                onClick={() => setActiveBar(activeBar === i ? null : i)}
                style={{ cursor: 'pointer' }}
              >
                {/* Regular */}
                {d.regular > 0 && (
                  <rect x={x} y={(yOffset -= regularH)} width={barWidth} height={regularH}
                    rx={d.annualLeave + d.sickLeave + d.overtime === 0 ? 4 : 0}
                    fill="#10b981" opacity={activeBar === null || activeBar === i ? 1 : 0.4}
                    className="transition-all duration-300" />
                )}
                {/* Annual Leave */}
                {d.annualLeave > 0 && (
                  <rect x={x} y={(yOffset -= annualH)} width={barWidth} height={annualH}
                    fill="#a855f7" opacity={activeBar === null || activeBar === i ? 1 : 0.4}
                    className="transition-all duration-300" />
                )}
                {/* Sick Leave */}
                {d.sickLeave > 0 && (
                  <rect x={x} y={(yOffset -= sickH)} width={barWidth} height={sickH}
                    fill="#ef4444" opacity={activeBar === null || activeBar === i ? 1 : 0.4}
                    className="transition-all duration-300" />
                )}
                {/* Overtime */}
                {d.overtime > 0 && (
                  <rect x={x} y={(yOffset -= overtimeH)} width={barWidth} height={overtimeH}
                    rx={4} fill="#f97316" opacity={activeBar === null || activeBar === i ? 1 : 0.4}
                    className="transition-all duration-300" />
                )}
                {/* Top rounded cap */}
                {barH > 0 && (
                  <rect x={x} y={chartHeight - barH + 5} width={barWidth} height={Math.min(8, barH)}
                    rx={4} fill="transparent" />
                )}
                <text x={x + barWidth / 2} y={chartHeight + 20} fontSize={9}
                  fill={isDark ? '#9ca3af' : '#64748b'} textAnchor="middle">{d.label}</text>
              </g>
            );
          })}

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Legend (hours mode only) */}
      {mode === 'hours' && (
        <div className="flex flex-wrap gap-3 justify-center mt-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Regular</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500" />Annual Leave</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" />Sick Leave</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />Overtime</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───
export default function StatsDashboard({ shifts, settings, jobs }: Props) {
  const t = useTranslation(settings.language);
  const isDark = settings.theme === 'dark';

  const [period, setPeriod] = useState<StatsPeriod>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customStart, setCustomStart] = useState(format(subMonths(new Date(), 2), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Period range
  const { start, end } = useMemo(() => {
    const ws = settings.weekStartsOn ?? 1;
    if (period === 'WEEK') return { start: startOfWeek(currentDate, { weekStartsOn: ws }), end: endOfWeek(currentDate, { weekStartsOn: ws }) };
    if (period === 'MONTH') return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    if (period === 'YEAR') return { start: startOfYear(currentDate), end: endOfYear(currentDate) };
    return { start: parseISO(customStart), end: parseISO(customEnd) };
  }, [period, currentDate, customStart, customEnd]);

  // Filtered shifts
  const filtered = useMemo(() => {
    return shifts.filter(s => isWithinInterval(parseISO(s.startTime), { start, end }));
  }, [shifts, start, end]);

  // Aggregated stats
  const stats = useMemo(() => {
    const totalHours = filtered.reduce((a, s) => a + getShiftPaidHours(s), 0);
    const totalEarnings = filtered.reduce((a, s) => a + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
    const annualLeaveUsed = filtered.filter(s => s.isAnnualLeave).reduce((a, s) => a + (s.annualLeaveHours || getShiftPaidHours(s)), 0);
    const sickLeaveUsed = filtered.filter(s => s.isSickLeave).reduce((a, s) => a + (s.sickLeaveHours || 0), 0);
    const sickDays = filtered.filter(s => s.isSickLeave).length;
    const overtimeHours = filtered.filter(s => s.isOvertime).reduce((a, s) => a + getShiftPaidHours(s), 0);
    const regularHours = totalHours - annualLeaveUsed;
    const uniqueDays = new Set(filtered.map(s => format(parseISO(s.startTime), 'yyyy-MM-dd'))).size;
    const avgDailyHours = uniqueDays > 0 ? totalHours / uniqueDays : 0;
    const avgDailyEarnings = uniqueDays > 0 ? totalEarnings / uniqueDays : 0;
    const avgPerShift = filtered.length > 0 ? totalHours / filtered.length : 0;
    const avgEarningsPerShift = filtered.length > 0 ? totalEarnings / filtered.length : 0;
    const longestShift = filtered.length > 0 ? Math.max(...filtered.map(s => getShiftPaidHours(s))) : 0;

    // Most productive day of week
    const dayTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    filtered.forEach(s => {
      const dow = getDay(parseISO(s.startTime));
      dayTotals[dow] += getShiftPaidHours(s);
      dayCounts[dow]++;
    });
    const dayAvgs = dayTotals.map((tot, i) => dayCounts[i] > 0 ? tot / dayCounts[i] : 0);
    const bestDayIdx = dayAvgs.indexOf(Math.max(...dayAvgs));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const mostProductiveDay = dayAvgs[bestDayIdx] > 0 ? dayNames[bestDayIdx] : '—';

    // Annual leave: all-time earned vs used
    const globalEarnedLeave = shifts.filter(s => !s.isAnnualLeave).reduce((a, s) => a + calculateAnnualLeaveHours(getShiftPaidHours(s)), 0);
    const globalUsedLeave = shifts.filter(s => s.isAnnualLeave).reduce((a, s) => a + getShiftPaidHours(s), 0);
    const leaveBalance = globalEarnedLeave - globalUsedLeave;

    // Period-specific leave
    const periodEarned = filtered.filter(s => !s.isAnnualLeave).reduce((a, s) => a + calculateAnnualLeaveHours(getShiftPaidHours(s)), 0);

    return {
      totalHours, totalEarnings, annualLeaveUsed, sickLeaveUsed, sickDays, overtimeHours,
      regularHours, uniqueDays, avgDailyHours, avgDailyEarnings, avgPerShift,
      avgEarningsPerShift, longestShift, mostProductiveDay, shiftCount: filtered.length,
      globalEarnedLeave, globalUsedLeave, leaveBalance, periodEarned,
    };
  }, [filtered, shifts]);

  // Bar chart data
  const barData: BarData[] = useMemo(() => {
    const ws = settings.weekStartsOn ?? 1;
    let groups: { label: string; fullLabel: string; shifts: Shift[] }[];

    if (period === 'WEEK') groups = groupShiftsByDay(filtered, start, end);
    else if (period === 'MONTH') groups = groupShiftsByWeek(filtered, start, end, ws);
    else if (period === 'YEAR') groups = groupShiftsByMonth(filtered, start, end);
    else groups = groupShiftsByMonth(filtered, start, end);

    return groups.map(g => {
      const regular = g.shifts.filter(s => !s.isAnnualLeave && !s.isSickLeave && !s.isOvertime)
        .reduce((a, s) => a + getShiftPaidHours(s), 0);
      const annualLeave = g.shifts.filter(s => s.isAnnualLeave)
        .reduce((a, s) => a + (s.annualLeaveHours || getShiftPaidHours(s)), 0);
      const sickLeave = g.shifts.filter(s => s.isSickLeave)
        .reduce((a, s) => a + (s.sickLeaveHours || 0), 0);
      const overtime = g.shifts.filter(s => s.isOvertime)
        .reduce((a, s) => a + getShiftPaidHours(s), 0);
      const total = g.shifts.reduce((a, s) => a + getShiftPaidHours(s), 0);
      const earnings = g.shifts.reduce((a, s) => a + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
      return { label: g.label, fullLabel: g.fullLabel, regular, annualLeave, sickLeave, overtime, total, earnings };
    });
  }, [filtered, period, start, end]);

  // Navigation
  const handlePrev = async () => {
    await haptic.light();
    if (period === 'WEEK') setCurrentDate(subWeeks(currentDate, 1));
    else if (period === 'MONTH') setCurrentDate(subMonths(currentDate, 1));
    else if (period === 'YEAR') setCurrentDate(subYears(currentDate, 1));
  };
  const handleNext = async () => {
    await haptic.light();
    if (period === 'WEEK') setCurrentDate(addWeeks(currentDate, 1));
    else if (period === 'MONTH') setCurrentDate(addMonths(currentDate, 1));
    else if (period === 'YEAR') setCurrentDate(addYears(currentDate, 1));
  };

  const periodLabel = useMemo(() => {
    const ws = settings.weekStartsOn ?? 1;
    if (period === 'WEEK') {
      return `${format(startOfWeek(currentDate, { weekStartsOn: ws }), 'MMM d')} – ${format(endOfWeek(currentDate, { weekStartsOn: ws }), 'MMM d, yyyy')}`;
    }
    if (period === 'MONTH') return format(currentDate, 'MMMM yyyy');
    if (period === 'YEAR') return format(currentDate, 'yyyy');
    return `${format(parseISO(customStart), 'MMM d, yyyy')} – ${format(parseISO(customEnd), 'MMM d, yyyy')}`;
  }, [period, currentDate, customStart, customEnd]);

  return (
    <div className="p-4 space-y-4 pb-36">
      {/* ── Period Selector ── */}
      <div>
        <div className="flex gap-1 bg-slate-100 dark:bg-gray-700 rounded-xl p-1 mb-3">
          {(['WEEK', 'MONTH', 'YEAR', 'CUSTOM'] as StatsPeriod[]).map(p => (
            <button key={p} onClick={async () => { await haptic.selection(); setPeriod(p); }}
              className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${period === p
                ? 'bg-white dark:bg-gray-600 text-[var(--color-primary)] shadow-sm'
                : 'text-slate-500 dark:text-gray-400'
              }`}
            >
              {p === 'WEEK' ? (settings.language === 'zh' ? '週' : 'Week')
                : p === 'MONTH' ? (settings.language === 'zh' ? '月' : 'Month')
                : p === 'YEAR' ? (settings.language === 'zh' ? '年' : 'Year')
                : (settings.language === 'zh' ? '自訂' : 'Custom')}
            </button>
          ))}
        </div>

        {/* Date navigation or custom pickers */}
        {period !== 'CUSTOM' ? (
          <div className="flex items-center justify-between">
            <button onClick={handlePrev} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft size={20} className="text-slate-500" />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">{periodLabel}</span>
            <button onClick={handleNext} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronRight size={20} className="text-slate-500" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="text-xs text-slate-500 dark:text-gray-400 mb-0.5 block">{settings.language === 'zh' ? '開始日期' : 'Start'}</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-gray-200" />
            </div>
            <span className="text-slate-400 mt-4">→</span>
            <div className="flex-1">
              <label className="text-xs text-slate-500 dark:text-gray-400 mb-0.5 block">{settings.language === 'zh' ? '結束日期' : 'End'}</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-gray-200" />
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 mb-1">
            <Clock size={12} />
            {settings.language === 'zh' ? '總工時' : 'Total Hours'}
          </div>
          <div className="text-2xl font-bold text-[var(--color-primary)]">{stats.totalHours.toFixed(1)}h</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 mb-1">
            <DollarSign size={12} />
            {settings.language === 'zh' ? '總收入' : 'Earnings'}
          </div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalEarnings, settings.currency)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 mb-1">
            <TrendingUp size={12} />
            {settings.language === 'zh' ? '日均工時' : 'Avg Daily Hours'}
          </div>
          <div className="text-xl font-bold text-slate-700 dark:text-gray-200">{stats.avgDailyHours.toFixed(1)}h</div>
          <div className="text-xs text-slate-400">{stats.uniqueDays} {settings.language === 'zh' ? '工作天' : 'working days'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 mb-1">
            <DollarSign size={12} />
            {settings.language === 'zh' ? '日均收入' : 'Avg Daily Earnings'}
          </div>
          <div className="text-xl font-bold text-green-600">{formatCurrency(stats.avgDailyEarnings, settings.currency)}</div>
        </div>
      </div>

      {/* ── Bar Chart: Hours ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-200">
            {settings.language === 'zh' ? '工時分佈' : 'Hours Distribution'}
          </h3>
        </div>
        {barData.length > 0 && barData.some(d => d.total > 0) ? (
          <BarChart data={barData} mode="hours" currency={settings.currency} isDark={isDark} />
        ) : (
          <div className="text-center text-sm text-slate-400 py-8">{settings.language === 'zh' ? '此時段無資料' : 'No data for this period'}</div>
        )}
      </div>

      {/* ── Bar Chart: Earnings ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} className="text-green-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-200">
            {settings.language === 'zh' ? '收入分佈' : 'Earnings Distribution'}
          </h3>
        </div>
        {barData.length > 0 && barData.some(d => d.earnings > 0) ? (
          <BarChart data={barData} mode="earnings" currency={settings.currency} isDark={isDark} />
        ) : (
          <div className="text-center text-sm text-slate-400 py-8">{settings.language === 'zh' ? '此時段無資料' : 'No data for this period'}</div>
        )}
      </div>

      {/* ── Annual Leave Tracker ── */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-3">
          <Palmtree size={16} className="text-purple-500" />
          <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
            {settings.language === 'zh' ? '年假追蹤' : 'Annual Leave Tracker'}
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.globalEarnedLeave.toFixed(1)}h</div>
            <div className="text-xs text-purple-500 dark:text-purple-400">{settings.language === 'zh' ? '已累積' : 'Earned'}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{stats.globalUsedLeave.toFixed(1)}h</div>
            <div className="text-xs text-purple-500 dark:text-purple-400">{settings.language === 'zh' ? '已使用' : 'Used'}</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${stats.leaveBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{stats.leaveBalance.toFixed(1)}h</div>
            <div className="text-xs text-purple-500 dark:text-purple-400">{settings.language === 'zh' ? '結餘' : 'Balance'}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="relative h-3 bg-purple-100 dark:bg-purple-900/40 rounded-full overflow-hidden">
          <div className="absolute h-full bg-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${stats.globalEarnedLeave > 0 ? Math.min(100, (stats.globalUsedLeave / stats.globalEarnedLeave) * 100) : 0}%` }} />
        </div>
        <div className="text-xs text-purple-400 dark:text-purple-500 mt-1 text-right">
          {stats.globalEarnedLeave > 0 ? ((stats.globalUsedLeave / stats.globalEarnedLeave) * 100).toFixed(0) : 0}% {settings.language === 'zh' ? '已使用' : 'used'}
        </div>
        {/* This period earned */}
        <div className="mt-2 pt-2 border-t border-purple-200 dark:border-purple-800 text-xs text-purple-500 dark:text-purple-400">
          {settings.language === 'zh' ? '本期獲得' : 'Earned this period'}: <span className="font-semibold">{stats.periodEarned.toFixed(1)}h</span>
          {' · '}
          {settings.language === 'zh' ? '本期使用' : 'Used this period'}: <span className="font-semibold">{stats.annualLeaveUsed.toFixed(1)}h</span>
        </div>
      </div>

      {/* ── Sick Leave Summary ── */}
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-100 dark:border-red-800">
        <div className="flex items-center gap-2 mb-2">
          <Stethoscope size={16} className="text-red-500" />
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
            {settings.language === 'zh' ? '病假統計' : 'Sick Leave Summary'}
          </h3>
        </div>
        <div className="flex justify-around">
          <div className="text-center">
            <div className="text-xl font-bold text-red-700 dark:text-red-300">{stats.sickLeaveUsed.toFixed(1)}h</div>
            <div className="text-xs text-red-500 dark:text-red-400">{settings.language === 'zh' ? '無薪時數' : 'Unpaid Hours'}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-700 dark:text-red-300">{stats.sickDays}</div>
            <div className="text-xs text-red-500 dark:text-red-400">{settings.language === 'zh' ? '病假天數' : 'Sick Days'}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">{stats.overtimeHours.toFixed(1)}h</div>
            <div className="text-xs text-orange-500 dark:text-orange-400">{settings.language === 'zh' ? '加班時數' : 'Overtime'}</div>
          </div>
        </div>
      </div>

      {/* ── By Job ── */}
      {jobs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={16} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-200">
              {settings.language === 'zh' ? '按工作分類' : 'By Job'}
            </h3>
          </div>
          <div className="space-y-3">
            {jobs.map(job => {
              const jobShifts = filtered.filter(s => s.jobId === job.id);
              const hours = jobShifts.reduce((a, s) => a + getShiftPaidHours(s), 0);
              const earnings = jobShifts.reduce((a, s) => a + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
              const avgH = jobShifts.length > 0 ? hours / jobShifts.length : 0;
              const pct = stats.totalHours > 0 ? (hours / stats.totalHours) * 100 : 0;
              return (
                <div key={job.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: job.color }} />
                      <span className="text-sm text-slate-700 dark:text-gray-200">{job.name}</span>
                      <span className="text-xs text-slate-400">({jobShifts.length})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-slate-700 dark:text-gray-200">{hours.toFixed(1)}h</span>
                      <span className="text-xs text-green-600 ml-2">{formatCurrency(earnings, settings.currency)}</span>
                    </div>
                  </div>
                  {/* Proportion bar */}
                  <div className="h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: job.color }} />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {settings.language === 'zh' ? `平均 ${avgH.toFixed(1)}h/班` : `Avg ${avgH.toFixed(1)}h/shift`}
                    {' · '}{pct.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Key Metrics ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Award size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-200">
            {settings.language === 'zh' ? '關鍵指標' : 'Key Metrics'}
          </h3>
        </div>
        <div className="space-y-2">
          {[
            { label: settings.language === 'zh' ? '總班次' : 'Total Shifts', value: `${stats.shiftCount}` },
            { label: settings.language === 'zh' ? '工作天數' : 'Working Days', value: `${stats.uniqueDays}` },
            { label: settings.language === 'zh' ? '平均時數/班' : 'Avg Hours/Shift', value: `${stats.avgPerShift.toFixed(1)}h` },
            { label: settings.language === 'zh' ? '平均收入/班' : 'Avg Earnings/Shift', value: formatCurrency(stats.avgEarningsPerShift, settings.currency) },
            { label: settings.language === 'zh' ? '最長班次' : 'Longest Shift', value: `${stats.longestShift.toFixed(1)}h` },
            { label: settings.language === 'zh' ? '最高產日' : 'Most Productive Day', value: stats.mostProductiveDay },
          ].map((row, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50 dark:border-gray-700 last:border-0">
              <span className="text-sm text-slate-500 dark:text-gray-400">{row.label}</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
