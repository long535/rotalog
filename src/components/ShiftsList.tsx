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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm z-10">
        <h1 className="text-xl font-bold">{t.appTitle}</h1>
        <div className="flex items-center gap-3">
          <label className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer" title={t.importCSV}>
            <Upload size={20} />
            <input type="file" accept=".csv" className="hidden" onChange={onImport} />
          </label>
          <button onClick={onExport} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title={t.exportCSV}>
            <Download size={20} />
          </button>
          <button onClick={onOpenSettings} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title={t.settings}>
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex overflow-x-auto p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hide-scrollbar">
        {(['ALL', 'WEEK', 'MONTH', 'YEAR'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 whitespace-nowrap text-sm font-medium rounded-full ${filter === f ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {f === 'ALL' ? t.filterAll : f === 'WEEK' ? t.filterWeek : f === 'MONTH' ? t.filterMonth : t.filterYear}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredShifts.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            {t.noRecords}
          </div>
        ) : (
          filteredShifts.map(shift => {
            const paidHours = getShiftPaidHours(shift);
            const wages = calculateWages(paidHours, shift.hourlyWage);
            const isMenuOpen = menuOpenId === shift.id;

            return (
              <div key={shift.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-lg flex items-center gap-2">
                    {format(parseISO(shift.startTime), 'MMM dd, EEE')}
                    {shift.isAnnualLeave && (
                      <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full font-medium">
                        {t.annualLeave}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <button onClick={() => setMenuOpenId(isMenuOpen ? null : shift.id)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full">
                      <MoreVertical size={18} />
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                        <button onClick={() => { onEdit(shift); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                          <Edit2 size={14} /> {t.edit}
                        </button>
                        <button onClick={() => { onDuplicate(shift.id); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                          <Copy size={14} /> {t.duplicate}
                        </button>
                        <button onClick={() => { onDelete(shift.id); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                          <Trash2 size={14} /> {t.delete}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-gray-600 dark:text-gray-400 text-sm">
                    {format(parseISO(shift.startTime), 'HH:mm')} - {format(parseISO(shift.endTime), 'HH:mm')}
                    {shift.notes && <div className="mt-1 text-xs text-gray-500 truncate max-w-[200px]">{t.notes}: {shift.notes}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{paidHours.toFixed(1)}h</div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">{formatCurrency(wages, settings.currency)}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 pb-safe">
        <div className="flex justify-between items-center mb-3">
          <button onClick={handlePrev} disabled={filter === 'ALL'} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
            <ChevronLeft size={20} />
          </button>
          <div className="font-medium text-sm uppercase tracking-wider">{getDateRangeLabel()}</div>
          <button onClick={handleNext} disabled={filter === 'ALL'} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="flex justify-between items-start text-lg font-bold mt-2">
          <div>
            <div>{t.total}: {totalHours.toFixed(1)}h</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1">
              {t.periodEarned}: {periodEarnedLeave.toFixed(2)}h | {t.periodUsed}: {periodUsedLeave.toFixed(2)}h
            </div>
            <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
              {t.leaveBalance}: {globalLeaveBalance.toFixed(2)}h
            </div>
          </div>
          <div className="text-right">
            <div className="text-green-600 dark:text-green-400">{formatCurrency(totalWages, settings.currency)}</div>
            {ukDeductions && filter !== 'ALL' && (
              <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-2 space-y-1 text-right">
                <div className="flex justify-end gap-2"><span>Tax:</span> <span className="w-16 text-red-500">-{formatCurrency(ukDeductions.tax, settings.currency)}</span></div>
                <div className="flex justify-end gap-2"><span>N.I.:</span> <span className="w-16 text-red-500">-{formatCurrency(ukDeductions.ni, settings.currency)}</span></div>
                <div className="flex justify-end gap-2"><span>Pension:</span> <span className="w-16 text-red-500">-{formatCurrency(ukDeductions.pension, settings.currency)}</span></div>
                <div className="text-sm text-indigo-600 dark:text-indigo-400 font-bold pt-1 border-t border-gray-200 dark:border-gray-700 mt-1 flex justify-end gap-2">
                  <span>Net Pay:</span> <span className="w-16">{formatCurrency(ukDeductions.netPay, settings.currency)}</span>
                </div>
                <div className="text-[10px] opacity-60 mt-1">{t.estimateOnly}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={onAdd}
        className="absolute bottom-24 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-transform active:scale-95 z-10"
      >
        <Plus size={24} />
      </button>
      
      {/* Click outside to close menu */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
}
