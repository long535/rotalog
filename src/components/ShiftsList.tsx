import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears, isSameDay, isToday, getDaysInMonth, getDay } from 'date-fns';
import { Plus, Settings as SettingsIcon, MoreVertical, Copy, Edit2, Trash2, List, Calendar, History } from 'lucide-react';
import { Shift, AppSettings, TimerState, Job } from '../types';
import { calculateWages, calculateAnnualLeaveHours, formatCurrency, getShiftPaidHours, calculateUKDeductions } from '../utils';
import { useTranslation } from '../i18n';
import { haptic } from '../haptics';
import TimerModal from './TimerModal';

type FilterType = 'ALL' | 'WEEK' | 'MONTH' | 'YEAR';
type ViewMode = 'LIST' | 'CALENDAR';
type PageView = 'LIST' | 'HISTORY' | 'STATS';
type BottomNavPage = 'home' | 'history' | 'stats' | 'settings';

interface Props {
  shifts: Shift[];
  settings: AppSettings;
  timer: TimerState;
  pageView?: PageView;
  onAdd: () => void;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpenSettings: () => void;
  onShowHistory?: () => void;
  onShowStats?: () => void;
  onBackToList?: () => void;
  onStartTimer: (durationMinutes: number, notificationIds: number[]) => void;
  onStopTimer: () => void;
  onPauseTimer: (remainingSeconds: number) => void;
  onResumeTimer: () => void;
  jobs?: Job[];
}

const JOB_COLORS = [
  { name: 'Sakura', value: '#fce4ec', accent: '#f06292' },
  { name: 'Indigo', value: '#e8eaf6', accent: '#3f51b5' },
  { name: 'Mint', value: '#e8f5e9', accent: '#66bb6a' },
];

export default function ShiftsList({ shifts, settings, timer, pageView = 'LIST', onAdd, onEdit, onDelete, onDuplicate, onOpenSettings, onShowHistory, onShowStats, onBackToList, onStartTimer, onStopTimer, onPauseTimer, onResumeTimer, jobs = [] }: Props) {
  const [filter, setFilter] = useState<FilterType>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showTimer, setShowTimer] = useState(false);
  const [jobFilter, setJobFilter] = useState<string | null>(null);
  const [groupByJob, setGroupByJob] = useState(false);
  const [bottomNavPage, setBottomNavPage] = useState<BottomNavPage>('home');
  const t = useTranslation(settings.language);

  const localJobs = jobs.length > 0 ? jobs : settings.jobs;

  const getJobColor = (jobId: string | null | undefined) => {
    if (!jobId) return JOB_COLORS[1];
    const job = localJobs.find(j => j.id === jobId);
    if (!job) return JOB_COLORS[1];
    const colorObj = JOB_COLORS.find(c => c.accent.toLowerCase() === job.color.toLowerCase()) || JOB_COLORS[1];
    return colorObj;
  };

  const renderShiftCard = (shift: Shift, index: number) => {
    const paidHours = getShiftPaidHours(shift);
    const wages = calculateWages(paidHours, shift.hourlyWage);
    const isMenuOpen = menuOpenId === shift.id;
    const jobColor = getJobColor(shift.jobId);

    return (
      <div 
        key={shift.id} 
        className="group relative flex items-center justify-between p-5 bg-white rounded-[1rem] shadow-sm border border-slate-50 hover:shadow-md transition-all duration-200"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-400">
              {format(parseISO(shift.startTime), 'MMM dd')} ({format(parseISO(shift.startTime), 'EEE')})
            </span>
            {shift.isAnnualLeave && (
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            )}
            {shift.jobId && (() => {
              const job = localJobs.find(j => j.id === shift.jobId);
              return job ? (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: job.color }} />
              ) : null;
            })()}
          </div>
          <div className="text-lg font-bold text-slate-800">
            {format(parseISO(shift.startTime), 'HH:mm')} - {format(parseISO(shift.endTime), 'HH:mm')}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {shift.jobId && localJobs.find(j => j.id === shift.jobId) ? (
              <>
                <span>{localJobs.find(j => j.id === shift.jobId)?.name}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
              </>
            ) : null}
            <span className="font-medium text-[var(--color-primary)]">{paidHours.toFixed(1)} hrs</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div 
            className="size-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: shift.isAnnualLeave ? '#fce4ec' : jobColor.value }}
          >
            {shift.isAnnualLeave ? (
              <span className="material-symbols-outlined text-purple-500">beach_access</span>
            ) : shift.jobId && localJobs.find(j => j.id === shift.jobId) ? (
              <span className="material-symbols-outlined" style={{ color: jobColor.accent }}>work</span>
            ) : (
              <span className="material-symbols-outlined text-[var(--color-primary)]">schedule</span>
            )}
          </div>
          
          <button 
            onClick={() => handleMenuOpen(shift.id)} 
            className="p-2 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={18} />
          </button>
        </div>
        
        {isMenuOpen && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-30 animate-scale-in overflow-hidden">
            <button onClick={() => handleEdit(shift)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700">
              <Edit2 size={16} className="text-[var(--color-primary)]" /> {t.edit}
            </button>
            <button onClick={() => handleDuplicate(shift.id)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-3 text-slate-700">
              <Copy size={16} className="text-green-500" /> {t.duplicate}
            </button>
            <button onClick={() => handleDelete(shift.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-3">
              <Trash2 size={16} /> {t.delete}
            </button>
          </div>
        )}
      </div>
    );
  };

  const filteredShifts = useMemo(() => {
    if (filter === 'ALL') return [...shifts].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    let start: Date, end: Date;
    if (filter === 'WEEK') {
      start = startOfWeek(currentDate, { weekStartsOn: settings.weekStartsOn ?? 1 });
      end = endOfWeek(currentDate, { weekStartsOn: settings.weekStartsOn ?? 1 });
    } else if (filter === 'MONTH') {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else {
      start = startOfYear(currentDate);
      end = endOfYear(currentDate);
    }

    return shifts
      .filter(s => isWithinInterval(parseISO(s.startTime), { start, end }))
      .filter(s => !jobFilter || s.jobId === jobFilter)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [shifts, filter, currentDate, jobFilter]);

  const groupedShifts = useMemo(() => {
    if (!groupByJob || localJobs.length === 0) return null;
    const groups: { [jobId: string]: Shift[] } = {};
    filteredShifts.forEach(shift => {
      const jobId = shift.jobId || 'no-job';
      if (!groups[jobId]) groups[jobId] = [];
      groups[jobId].push(shift);
    });
    return groups as { [jobId: string]: Shift[] };
  }, [filteredShifts, groupByJob, localJobs]);

  const globalEarnedLeave = useMemo(() => {
    return shifts.filter(s => !s.isAnnualLeave).reduce((acc, s) => acc + calculateAnnualLeaveHours(getShiftPaidHours(s)), 0);
  }, [shifts]);

  const globalUsedLeave = useMemo(() => {
    return shifts.filter(s => s.isAnnualLeave).reduce((acc, s) => acc + getShiftPaidHours(s), 0);
  }, [shifts]);

  const globalLeaveBalance = globalEarnedLeave - globalUsedLeave;

  const totalHours = filteredShifts.reduce((acc, s) => acc + getShiftPaidHours(s), 0);
  const totalWages = filteredShifts.reduce((acc, s) => acc + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
  
  const periodEarnedLeave = filteredShifts.filter(s => !s.isAnnualLeave).reduce((acc, s) => acc + calculateAnnualLeaveHours(getShiftPaidHours(s)), 0);
  const periodUsedLeave = filteredShifts.filter(s => s.isAnnualLeave).reduce((acc, s) => acc + getShiftPaidHours(s), 0);

  const ukDeductions = settings.enableUKTaxes ? calculateUKDeductions(totalWages, filter) : null;

  const handlePrev = async () => {
    await haptic.light();
    if (filter === 'WEEK') setCurrentDate(subWeeks(currentDate, 1));
    else if (filter === 'MONTH') setCurrentDate(subMonths(currentDate, 1));
    else if (filter === 'YEAR') setCurrentDate(subYears(currentDate, 1));
  };

  const handleNext = async () => {
    await haptic.light();
    if (filter === 'WEEK') setCurrentDate(addWeeks(currentDate, 1));
    else if (filter === 'MONTH') setCurrentDate(addMonths(currentDate, 1));
    else if (filter === 'YEAR') setCurrentDate(addYears(currentDate, 1));
  };

  const getDateRangeLabel = () => {
    if (filter === 'ALL') return t.filterAll;
    if (filter === 'WEEK') {
      return `${format(startOfWeek(currentDate, { weekStartsOn: settings.weekStartsOn ?? 1 }), 'MMM dd')} - ${format(endOfWeek(currentDate, { weekStartsOn: settings.weekStartsOn ?? 1 }), 'MMM dd, yyyy')}`;
    }
    if (filter === 'MONTH') {
      return format(currentDate, 'MMMM yyyy');
    }
    if (filter === 'YEAR') {
      return format(currentDate, 'yyyy');
    }
    return '';
  };

  const handleFilterChange = async (f: FilterType) => {
    await haptic.selection();
    setFilter(f);
  };

  const handleViewModeChange = async (mode: ViewMode) => {
    await haptic.selection();
    setViewMode(mode);
    if (mode === 'CALENDAR') {
      setFilter('MONTH');
    }
  };

  const handleAdd = async () => {
    await haptic.medium();
    onAdd();
  };

  const handleEdit = async (shift: Shift) => {
    await haptic.light();
    onEdit(shift);
    setMenuOpenId(null);
  };

  const handleDuplicate = async (id: string) => {
    await haptic.light();
    onDuplicate(id);
    setMenuOpenId(null);
  };

  const handleDelete = async (id: string) => {
    await haptic.heavy();
    onDelete(id);
    setMenuOpenId(null);
  };

  const handleMenuOpen = async (id: string) => {
    await haptic.light();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || filter === 'ALL') return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > 100) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    
    setTouchStartX(null);
  };

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = getDaysInMonth(currentDate);
    const startDay = getDay(monthStart);
    const weekStartsOn = settings.weekStartsOn ?? 1;
    const adjustedStartDay = (startDay - weekStartsOn + 7) % 7;

    const days: (Date | null)[] = [];
    for (let i = 0; i < adjustedStartDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    return days;
  }, [currentDate, settings.weekStartsOn]);

  const getShiftsForDate = (date: Date) => {
    return shifts.filter(s => isSameDay(parseISO(s.startTime), date));
  };

  const selectedDateShifts = selectedCalendarDate ? getShiftsForDate(selectedCalendarDate) : [];

  const handleCalendarDateClick = async (date: Date) => {
    await haptic.light();
    if (selectedCalendarDate && isSameDay(selectedCalendarDate, date)) {
      handleAdd();
    } else {
      setSelectedCalendarDate(date);
    }
  };

  const handleBottomNav = async (page: BottomNavPage) => {
    await haptic.selection();
    if (page === 'home') {
      setCurrentDate(new Date());
      if (onBackToList) onBackToList();
    } else if (page === 'settings') {
      onOpenSettings();
    } else if (page === 'history' && onShowHistory) {
      onShowHistory();
    } else if (page === 'stats' && onShowStats) {
      onShowStats();
    }
    setBottomNavPage(page);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {pageView === 'HISTORY' || pageView === 'STATS' ? (
              <button onClick={onBackToList} className="p-1.5 hover:bg-slate-50 rounded-full transition-colors">
                <span className="material-symbols-outlined text-slate-600">arrow_back</span>
              </button>
            ) : null}
            <span className="material-symbols-outlined text-[var(--color-primary)] text-xl">
              {pageView === 'HISTORY' ? 'history' : pageView === 'STATS' ? 'bar_chart' : 'calendar_month'}
            </span>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">
              {pageView === 'HISTORY' ? 'History' : pageView === 'STATS' ? 'Statistics' : 'Rotalog'}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            {pageView === 'LIST' && (
              <button 
                onClick={() => handleBottomNav('stats')}
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                title="Statistics"
              >
                <span className="material-symbols-outlined text-slate-600">bar_chart</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs - only show on LIST view */}
        {pageView === 'LIST' && (
        <div className="flex px-4 space-x-6 pb-2">
          {(['ALL', 'WEEK', 'MONTH'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`relative pb-2 text-xs font-semibold transition-colors ${
                filter === f 
                  ? 'text-[var(--color-primary)]' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {f === 'ALL' ? t.filterAll : f === 'WEEK' ? t.filterWeek : t.filterMonth}
              {filter === f && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-primary)] rounded-full"></span>
              )}
            </button>
          ))}
        </div>
        )}
      </header>

      {/* Job Filter Pills - only show on LIST view */}
      {pageView === 'LIST' && localJobs.length > 0 && (
        <div className="flex overflow-x-auto px-4 py-3 border-b border-slate-100 hide-scrollbar gap-2">
          <button
            onClick={() => setJobFilter(null)}
            className={`px-4 py-1.5 whitespace-nowrap text-xs font-semibold rounded-full transition-all ${
              jobFilter === null 
                ? 'bg-slate-800 text-white' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {t.allJobs}
          </button>
          {localJobs.map(job => (
            <button
              key={job.id}
              onClick={() => setJobFilter(job.id)}
              className={`px-4 py-1.5 whitespace-nowrap text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                jobFilter === job.id
                  ? 'bg-slate-800 text-white' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: job.color }} />
              {job.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-28" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {pageView === 'HISTORY' ? (
          /* History View - All shifts with pagination style */
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">All Records</h2>
              <div className="flex flex-col gap-3">
                {shifts.length === 0 ? (
                  <div className="text-center py-16 animate-fade-in">
                    <div className="text-6xl mb-4">📝</div>
                    <div className="text-slate-400 text-lg">{t.noRecords}</div>
                  </div>
                ) : (
                  shifts
                    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                    .map((shift, index) => renderShiftCard(shift, index))
                )}
              </div>
            </div>
          </div>
        ) : pageView === 'STATS' ? (
          /* Stats View */
          <div className="p-4 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Statistics</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Total Hours</div>
                <div className="text-2xl font-bold text-[var(--color-primary)]">
                  {shifts.reduce((acc, s) => acc + getShiftPaidHours(s), 0).toFixed(1)}h
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Total Earnings</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(shifts.reduce((acc, s) => acc + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0), settings.currency)}
                </div>
              </div>
            </div>

            {/* By Job */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">By Job</h3>
              {localJobs.length > 0 ? (
                <div className="space-y-3">
                  {localJobs.map(job => {
                    const jobShifts = shifts.filter(s => s.jobId === job.id);
                    const hours = jobShifts.reduce((acc, s) => acc + getShiftPaidHours(s), 0);
                    const earnings = jobShifts.reduce((acc, s) => acc + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
                    return (
                      <div key={job.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: job.color }} />
                          <span className="text-sm text-slate-700">{job.name}</span>
                          <span className="text-xs text-slate-400">({jobShifts.length})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{hours.toFixed(1)}h</div>
                          <div className="text-xs text-green-600">{formatCurrency(earnings, settings.currency)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-400">No jobs configured</div>
              )}
            </div>

            {/* This Month */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">This Month</h3>
              {(() => {
                const now = new Date();
                const monthShifts = shifts.filter(s => {
                  const d = new Date(s.startTime);
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
                const hours = monthShifts.reduce((acc, s) => acc + getShiftPaidHours(s), 0);
                const earnings = monthShifts.reduce((acc, s) => acc + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{hours.toFixed(1)}h</div>
                      <div className="text-xs text-slate-500">Hours</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(earnings, settings.currency)}</div>
                      <div className="text-xs text-slate-500">Earnings</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ) : viewMode === 'LIST' ? (
          <div className="p-4">
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                {filter === 'ALL' ? 'All Shifts' : filter === 'WEEK' ? `${format(startOfWeek(currentDate), 'MMM d')} - ${format(endOfWeek(currentDate), 'MMM d')}` : format(currentDate, 'MMMM yyyy')} Shifts
              </h2>
              <div className="flex flex-col gap-3">
                {filteredShifts.length === 0 ? (
                  <div className="text-center py-16 animate-fade-in">
                    <div className="text-6xl mb-4">📝</div>
                    <div className="text-slate-400 text-lg">{t.noRecords}</div>
                  </div>
                ) : groupByJob && groupedShifts ? (
                  (Object.entries(groupedShifts) as [string, Shift[]][]).map(([jobId, jobShifts]) => {
                    const job = jobId === 'no-job' ? null : localJobs.find(j => j.id === jobId);
                    const jobTotalHours = jobShifts.reduce((acc, s) => acc + getShiftPaidHours(s), 0);
                    const jobTotalWages = jobShifts.reduce((acc, s) => acc + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
                    
                    return (
                      <div key={jobId} className="space-y-3">
                        <div className="flex items-center justify-between px-2 py-2 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-2">
                            {job ? (
                              <>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: job.color }} />
                                <span className="font-semibold text-sm" style={{ color: job.color }}>{job.name}</span>
                              </>
                            ) : (
                              <>
                                <div className="w-3 h-3 rounded-full bg-slate-400" />
                                <span className="font-semibold text-sm text-slate-500">{t.noJob || 'No Job'}</span>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">{jobTotalHours.toFixed(1)}h</span>
                            <span className="mx-1">·</span>
                            <span className="font-medium text-green-600">{formatCurrency(jobTotalWages, settings.currency)}</span>
                          </div>
                        </div>
                        {jobShifts.map((shift, index) => (
                          renderShiftCard(shift, index)
                        ))}
                      </div>
                    );
                  })
                ) : (
                  filteredShifts.map((shift, index) => (
                    renderShiftCard(shift, index)
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Calendar View */
          <div className="p-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <span className="material-symbols-outlined text-slate-600">chevron_left</span>
                </button>
                <h2 className="text-lg font-bold tracking-tight uppercase">{format(currentDate, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <span className="material-symbols-outlined text-slate-600">chevron_right</span>
                </button>
              </div>
              
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 mb-2">
                {(() => {
                  const weekStartsOn = settings.weekStartsOn ?? 1;
                  const reorderedDays = [...t.weekDays.slice(weekStartsOn), ...t.weekDays.slice(0, weekStartsOn)];
                  return reorderedDays.map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-400 py-2">
                      {day}
                    </div>
                  ));
                })()}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-lg overflow-hidden">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="bg-white aspect-square" />;
                  }
                  
                  const dayShifts = getShiftsForDate(date);
                  const dayHours = dayShifts.reduce((acc, s) => acc + getShiftPaidHours(s), 0);
                  const isSelected = selectedCalendarDate && isSameDay(selectedCalendarDate, date);
                  const isTodayDate = isToday(date);
                  
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => handleCalendarDateClick(date)}
                      className={`bg-white aspect-square flex flex-col items-center justify-center relative transition-colors ${
                        isSelected ? 'bg-[var(--color-primary)] text-white' : 
                        isTodayDate ? 'bg-[var(--color-sakura)]' : 
                        dayShifts.length > 0 ? 'bg-[var(--color-mint-soft)]' : ''
                      }`}
                    >
                      <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                        {format(date, 'd')}
                      </span>
                      {dayShifts.length > 0 && !isSelected && (
                        <span className="text-[10px] text-slate-500 font-medium">{dayHours.toFixed(1)}h</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Selected Date Details */}
            {selectedDateShifts.length > 0 && (
              <div className="mt-4 space-y-3 animate-fade-in">
                <div className="text-sm font-semibold text-slate-600">
                  {format(selectedCalendarDate!, 'EEEE, MMMM d')}
                </div>
                {selectedDateShifts.map((shift) => {
                  const paidHours = getShiftPaidHours(shift);
                  const wages = calculateWages(paidHours, shift.hourlyWage);
                  const jobColor = getJobColor(shift.jobId);
                  
                  return (
                    <div 
                      key={shift.id} 
                      className="bg-white rounded-xl p-4 flex items-center justify-between border border-slate-100 shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: shift.isAnnualLeave ? '#fce4ec' : jobColor.value }}
                        >
                          <span className="material-symbols-outlined" style={{ color: shift.isAnnualLeave ? '#f06292' : jobColor.accent }}>
                            {shift.isAnnualLeave ? 'beach_access' : 'schedule'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {format(parseISO(shift.startTime), 'HH:mm')} - {format(parseISO(shift.endTime), 'HH:mm')}
                          </p>
                          <p className="text-xs text-slate-500">{paidHours.toFixed(1)} hours</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">{formatCurrency(wages, settings.currency)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer - Only show on LIST view */}
      <div className={`fixed bottom-20 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-4 py-3 mx-auto max-w-md ${pageView !== 'LIST' ? 'hidden' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}<span className="text-sm font-normal ml-1">h</span></div>
            <div className="text-xs text-slate-500">
              <span className="text-green-500">+{periodEarnedLeave.toFixed(1)}h</span> / <span className="text-orange-500">-{periodUsedLeave.toFixed(1)}h</span>
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-xl font-bold text-green-600">{formatCurrency(totalWages, settings.currency)}</div>
            {ukDeductions && filter !== 'ALL' && (
              <div className="text-xs text-slate-500">
                Net: {formatCurrency(ukDeductions.netPay, settings.currency)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button - Only show on LIST view */}
      <button 
        onClick={handleAdd}
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 size-12 bg-[var(--color-primary)] text-white rounded-full shadow-lg shadow-[var(--color-primary)]/30 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 z-20 ${pageView !== 'LIST' ? 'hidden' : ''}`}
      >
        <span className="material-symbols-outlined text-xl">add</span>
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-100 px-4 pb-safe pt-2 max-w-md mx-auto z-10">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => handleBottomNav('home')}
            className={`flex flex-col items-center gap-0.5 ${bottomNavPage === 'home' ? 'text-[var(--color-primary)]' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined fill-[1] text-xl">home</span>
            <span className="text-xs font-bold uppercase tracking-wider">Home</span>
          </button>
          <button 
            onClick={() => handleBottomNav('history')}
            className={`flex flex-col items-center gap-0.5 ${bottomNavPage === 'history' ? 'text-[var(--color-primary)]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="material-symbols-outlined text-xl">history</span>
            <span className="text-xs font-bold uppercase tracking-wider">History</span>
          </button>
          <button 
            onClick={() => handleViewModeChange(viewMode === 'LIST' ? 'CALENDAR' : 'LIST')}
            className={`flex flex-col items-center gap-0.5 ${viewMode === 'CALENDAR' ? 'text-[var(--color-primary)]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="material-symbols-outlined text-xl">calendar_month</span>
            <span className="text-xs font-bold uppercase tracking-wider">Calendar</span>
          </button>
          <button 
            onClick={() => handleBottomNav('settings')}
            className={`flex flex-col items-center gap-0.5 ${bottomNavPage === 'settings' ? 'text-[var(--color-primary)]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
          </button>
        </div>
      </nav>
      
      {/* Timer Modal */}
      {showTimer && (
        <TimerModal
          timer={timer}
          language={settings.language}
          onStart={onStartTimer}
          onStop={onStopTimer}
          onPause={onPauseTimer}
          onResume={onResumeTimer}
          onClose={() => setShowTimer(false)}
        />
      )}
      
      {/* Menu Backdrop */}
      {menuOpenId && (
        <div className="fixed inset-0 z-25" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
}
