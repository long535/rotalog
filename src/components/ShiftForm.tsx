import React, { useState } from 'react';
import { ArrowLeft, Check, Info } from 'lucide-react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Shift, AppSettings } from '../types';
import { calculatePaidHours, calculateAnnualLeaveHours } from '../utils';
import { useTranslation } from '../i18n';

interface Props {
  shift?: Shift;
  settings: AppSettings;
  onSave: (shifts: Shift[]) => void;
  onCancel: () => void;
}

export default function ShiftForm({ shift, settings, onSave, onCancel }: Props) {
  const isEditing = !!shift;
  const initialDate = shift ? format(parseISO(shift.startTime), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const initialTimeStart = shift ? format(parseISO(shift.startTime), 'HH:mm') : '10:00';
  const initialTimeEnd = shift ? format(parseISO(shift.endTime), 'HH:mm') : '20:00';

  const [baseDate, setBaseDate] = useState(initialDate);
  const [selectedDates, setSelectedDates] = useState<string[]>([initialDate]);
  const [timeStart, setTimeStart] = useState(initialTimeStart);
  const [timeEnd, setTimeEnd] = useState(initialTimeEnd);
  const [breakMinutes, setBreakMinutes] = useState(shift ? shift.breakMinutes.toString() : settings.defaultBreakMinutes.toString());
  const [hourlyWage, setHourlyWage] = useState(shift ? shift.hourlyWage.toString() : settings.defaultHourlyWage.toString());
  const [notes, setNotes] = useState(shift ? shift.notes : '');
  const [isAnnualLeave, setIsAnnualLeave] = useState(shift ? !!shift.isAnnualLeave : false);
  const [annualLeaveHours, setAnnualLeaveHours] = useState(shift?.annualLeaveHours?.toString() || '');
  const t = useTranslation(settings.language);

  const referenceDate = parseISO(baseDate);
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const weekDayLabels = t.weekDays;

  const getStartDateTime = (dateStr: string, timeStr: string) => {
    return `${dateStr}T${timeStr}:00`;
  };

  const getEndDateTime = (dateStr: string, startTimeStr: string, endTimeStr: string) => {
    let endDateStr = dateStr;
    if (endTimeStr < startTimeStr) {
      const date = parseISO(dateStr);
      const nextDay = addDays(date, 1);
      endDateStr = format(nextDay, 'yyyy-MM-dd');
    }
    return `${endDateStr}T${endTimeStr}:00`;
  };

  // Calculate paid hours for a single shift to show as preview
  const previewStartTime = getStartDateTime(selectedDates[0] || initialDate, timeStart);
  const previewEndTime = getEndDateTime(selectedDates[0] || initialDate, timeStart, timeEnd);
  
  const calculatedHours = calculatePaidHours(
    previewStartTime,
    previewEndTime,
    parseInt(breakMinutes) || 0
  );

  const finalPaidHours = isAnnualLeave && annualLeaveHours !== '' ? parseFloat(annualLeaveHours) || 0 : calculatedHours;

  const handleSave = () => {
    const shiftsToSave: Shift[] = selectedDates.map(dateStr => {
      return {
        id: isEditing ? shift.id : uuidv4(),
        startTime: new Date(getStartDateTime(dateStr, timeStart)).toISOString(),
        endTime: new Date(getEndDateTime(dateStr, timeStart, timeEnd)).toISOString(),
        breakMinutes: parseInt(breakMinutes) || 0,
        hourlyWage: parseFloat(hourlyWage) || 0,
        notes,
        isAnnualLeave,
        annualLeaveHours: isAnnualLeave ? (annualLeaveHours !== '' ? parseFloat(annualLeaveHours) : calculatedHours) : undefined,
      };
    });
    onSave(shiftsToSave);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">{isEditing ? t.editShift : t.addShift}</h1>
        </div>
        <button onClick={handleSave} disabled={selectedDates.length === 0} className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full disabled:opacity-50">
          <Check size={24} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.date} {selectedDates.length > 1 && `(${selectedDates.length}${t.days})`}</label>
            
            {isEditing ? (
              <input 
                type="date" 
                value={selectedDates[0]} 
                onChange={(e) => setSelectedDates([e.target.value])}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            ) : (
              <>
                <div className="mb-4">
                  <input 
                    type="date" 
                    value={baseDate} 
                    onChange={(e) => {
                      setBaseDate(e.target.value);
                      setSelectedDates([e.target.value]);
                    }}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex justify-between gap-1">
                  {weekDays.map((date, index) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isSelected = selectedDates.includes(dateStr);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          if (isSelected) {
                            if (selectedDates.length > 1) {
                              setSelectedDates(selectedDates.filter(d => d !== dateStr).sort());
                            }
                          } else {
                            setSelectedDates([...selectedDates, dateStr].sort());
                          }
                        }}
                        className={`flex-1 aspect-square max-w-[40px] rounded-full flex flex-col items-center justify-center text-sm transition-colors ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-md font-bold' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium'
                        }`}
                      >
                        <span>{weekDayLabels[index]}</span>
                        <span className="text-[10px] opacity-70 mt-0.5">{format(date, 'd')}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">{t.clickDayHint}</p>
              </>
            )}
          </div>

          <div className="flex flex-col p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50 gap-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-indigo-900 dark:text-indigo-100">{t.annualLeaveLabel}</div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300">{t.annualLeaveDesc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isAnnualLeave} onChange={(e) => setIsAnnualLeave(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            {isAnnualLeave && (
              <div className="pt-3 border-t border-indigo-100 dark:border-indigo-800/50">
                <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">{t.useHours}</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={annualLeaveHours}
                  onChange={(e) => setAnnualLeaveHours(e.target.value)}
                  placeholder={`${t.default}: ${calculatedHours.toFixed(1)}`}
                  className="w-full p-2 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.startTime}</label>
              <input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.endTime}</label>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.breakTime}</label>
            <input
              type="number"
              min="0"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
              {t.dailyPaidHours} <Info size={16} className="text-gray-400" />
            </div>
            <div className="text-right">
              <div className="text-xl font-bold">{finalPaidHours.toFixed(1)}h</div>
              {!isAnnualLeave && (
                <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">{t.earnedLeave}: {calculateAnnualLeaveHours(finalPaidHours).toFixed(2)}h</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.hourlyWage} ({settings.currency})</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.notesOptional}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder={t.notesPlaceholder}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
