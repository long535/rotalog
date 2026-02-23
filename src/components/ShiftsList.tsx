import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subWeeks, addWeeks, subMonths, addMonths, subYears, addYears } from 'date-fns';
import { Plus, Settings as SettingsIcon, Download, Upload, MoreVertical, Copy, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Shift, AppSettings } from '../types';
import { calculateWages, calculateAnnualLeaveHours, formatCurrency, getShiftPaidHours, calculateUKDeductions } from '../utils';
import { useTranslation } from '../i18n';

type FilterType = 'ALL' | 'WEEK' | 'MONTH' | 'YEAR';

interface Props {
  shifts: Shift[];
  settings: AppSettings;
  onAdd: () => void;
  onEdit: (shift: Shift) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ShiftsList({ shifts, settings, onAdd, onEdit, onDelete, onDuplicate, onOpenSettings, onExport, onImport }: Props) {
  const [filter, setFilter] = useState<FilterType>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const t = useTranslation(settings.language);

  const filteredShifts = useMemo(() => {
    if (filter === 'ALL') return [...shifts].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    let start: Date, end: Date;
    if (filter === 'WEEK') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else if (filter === 'MONTH') {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else {
      start = startOfYear(currentDate);
      end = endOfYear(currentDate);
    }

    return shifts
      .filter(s => isWithinInterval(parseISO(s.startTime), { start, end }))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [shifts, filter, currentDate]);

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

  const handlePrev = () => {
    if (filter === 'WEEK') setCurrentDate(subWeeks(currentDate, 1));
    else if (filter === 'MONTH') setCurrentDate(subMonths(currentDate, 1));
    else if (filter === 'YEAR') setCurrentDate(subYears(currentDate, 1));
  };

  const handleNext = () => {
    if (filter === 'WEEK') setCurrentDate(addWeeks(currentDate, 1));
    else if (filter === 'MONTH') setCurrentDate(addMonths(currentDate, 1));
    else if (filter === 'YEAR') setCurrentDate(addYears(currentDate, 1));
  };

  const getDateRangeLabel = () => {
    if (filter === 'ALL') return t.filterAll;
    if (filter === 'WEEK') {
      return `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM dd')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM dd, yyyy')}`;
    }
    if (filter === 'MONTH') {
      return format(currentDate, 'MMMM yyyy');
    }
    if (filter === 'YEAR') {
      return format(currentDate, 'yyyy');
    }
    return '';
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 glass border-b border-gray-200/50 dark:border-gray-700/50 z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">{t.appTitle}</h1>
        <div className="flex items-center gap-1">
          <label className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer transition-all duration-200 active:scale-95" title={t.importCSV}>
            <Upload size={20} className="text-gray-600 dark:text-gray-400" />
            <input type="file" accept=".csv" className="hidden" onChange={onImport} />
          </label>
          <button onClick={onExport} className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 active:scale-95" title={t.exportCSV}>
            <Download size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button onClick={onOpenSettings} className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 active:scale-95" title={t.settings}>
            <SettingsIcon size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex overflow-x-auto px-4 py-3 glass border-b border-gray-200/50 dark:border-gray-700/50 hide-scrollbar gap-2">
        {(['ALL', 'WEEK', 'MONTH', 'YEAR'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 whitespace-nowrap text-sm font-semibold rounded-full transition-all duration-300 ${
              filter === f 
                ? 'gradient-primary text-white shadow-lg shadow-indigo-500/30' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/70 dark:hover:bg-gray-700/50'
            }`}
          >
            {f === 'ALL' ? t.filterAll : f === 'WEEK' ? t.filterWeek : f === 'MONTH' ? t.filterMonth : t.filterYear}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredShifts.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">📝</div>
            <div className="text-gray-400 dark:text-gray-500 text-lg">{t.noRecords}</div>
            <div className="text-gray-400 dark:text-gray-500 text-sm mt-2">點擊 + 按鈕新增第一筆記錄</div>
          </div>
        ) : (
          filteredShifts.map((shift, index) => {
            const paidHours = getShiftPaidHours(shift);
            const wages = calculateWages(paidHours, shift.hourlyWage);
            const isMenuOpen = menuOpenId === shift.id;

            return (
              <div 
                key={shift.id} 
                className="bg-white dark:bg-gray-800/90 rounded-2xl p-4 card-shadow border border-gray-100/50 dark:border-gray-700/50 relative animate-slide-up transition-all duration-300 hover:card-shadow-lg"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="font-semibold text-lg flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold">
                      {format(parseISO(shift.startTime), 'd')}
                    </div>
                    <div>
                      <div>{format(parseISO(shift.startTime), 'MMM, EEE')}</div>
                      {shift.isAnnualLeave && (
                        <span className="px-2.5 py-0.5 text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-medium">
                          {t.annualLeave}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button onClick={() => setMenuOpenId(isMenuOpen ? null : shift.id)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
                      <MoreVertical size={18} />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-20 animate-scale-in overflow-hidden">
                        <button onClick={() => { onEdit(shift); setMenuOpenId(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 text-gray-700 dark:text-gray-300">
                          <Edit2 size={16} className="text-indigo-500" /> {t.edit}
                        </button>
                        <button onClick={() => { onDuplicate(shift.id); setMenuOpenId(null); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 text-gray-700 dark:text-gray-300">
                          <Copy size={16} className="text-green-500" /> {t.duplicate}
                        </button>
                        <button onClick={() => { onDelete(shift.id); setMenuOpenId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3">
                          <Trash2 size={16} /> {t.delete}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-gray-100 dark:border-gray-700/50">
                  <div className="text-gray-500 dark:text-gray-400 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
                      {format(parseISO(shift.startTime), 'HH:mm')} - {format(parseISO(shift.endTime), 'HH:mm')}
                    </div>
                    {shift.notes && <div className="mt-2 text-xs text-gray-400 truncate max-w-[180px]">{shift.notes}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{paidHours.toFixed(1)}<span className="text-sm font-normal ml-1">h</span></div>
                    <div className="text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">{formatCurrency(wages, settings.currency)}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary */}
      <div className="glass border-t border-gray-200/50 dark:border-gray-700/50 px-5 py-4 pb-safe">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrev} disabled={filter === 'ALL'} className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/50 disabled:opacity-30 transition-all active:scale-95">
            <ChevronLeft size={20} />
          </button>
          <div className="font-bold text-sm uppercase tracking-wider text-gray-600 dark:text-gray-400">{getDateRangeLabel()}</div>
          <button onClick={handleNext} disabled={filter === 'ALL'} className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/50 disabled:opacity-30 transition-all active:scale-95">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="text-3xl font-bold">{totalHours.toFixed(1)}<span className="text-lg font-normal ml-1">h</span></div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <span className="text-green-500">+{periodEarnedLeave.toFixed(1)}h</span> / <span className="text-orange-500">-{periodUsedLeave.toFixed(1)}h</span>
            </div>
            <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {t.leaveBalance}: <span className="font-bold">{globalLeaveBalance.toFixed(2)}h</span>
            </div>
          </div>
          <div className="text-right space-y-1">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">{formatCurrency(totalWages, settings.currency)}</div>
            {ukDeductions && filter !== 'ALL' && (
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 text-right pt-2">
                <div className="flex justify-end gap-3"><span>Tax:</span> <span className="w-14 text-red-400 font-medium">-{formatCurrency(ukDeductions.tax, settings.currency)}</span></div>
                <div className="flex justify-end gap-3"><span>N.I.:</span> <span className="w-14 text-red-400 font-medium">-{formatCurrency(ukDeductions.ni, settings.currency)}</span></div>
                <div className="flex justify-end gap-3"><span>Pension:</span> <span className="w-14 text-red-400 font-medium">-{formatCurrency(ukDeductions.pension, settings.currency)}</span></div>
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2 flex justify-end gap-3">
                  <span>Net:</span> <span className="w-14">{formatCurrency(ukDeductions.netPay, settings.currency)}</span>
                </div>
                <div className="text-[10px] opacity-50">{t.estimateOnly}</div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={onAdd}
            className="w-16 h-16 btn-fab text-white rounded-2xl flex items-center justify-center z-10 animate-bounce-in"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      
      {/* Click outside to close menu */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
}
