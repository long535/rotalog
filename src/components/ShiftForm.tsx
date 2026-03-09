import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Check, Info, Clock, DollarSign, FileText, Calendar, Camera, Image, X, Bell, Briefcase, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Images } from 'lucide-react';
import { format, parseISO, addDays, addMonths, startOfWeek, startOfMonth, getDaysInMonth, getDay, isSameMonth, isToday } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Shift, AppSettings, Job } from '../types';
import { calculatePaidHours, calculateAnnualLeaveHours, scheduleShiftAlarms, cancelAlarms } from '../utils';
import { useTranslation } from '../i18n';
import { haptic } from '../haptics';

interface Props {
  shift?: Shift;
  settings: AppSettings;
  onSave: (shifts: Shift[]) => void;
  onCancel: () => void;
  jobs?: Job[];
}

type ShiftType = 'regular' | 'overtime' | 'annual' | 'sick';

export default function ShiftForm({ shift, settings, onSave, onCancel, jobs = [] }: Props) {
  const isEditing = !!shift;
  const initialDate = shift ? format(parseISO(shift.startTime), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
  const initialTimeStart = shift ? format(parseISO(shift.startTime), 'HH:mm') : '10:00';
  const initialTimeEnd = shift ? format(parseISO(shift.endTime), 'HH:mm') : '20:00';

  const localJobs = jobs.length > 0 ? jobs : settings.jobs;
  const defaultJob = settings.defaultJobId ? localJobs.find(j => j.id === settings.defaultJobId) : null;

  const [baseDate, setBaseDate] = useState(initialDate);
  const [selectedDates, setSelectedDates] = useState<string[]>([initialDate]);
  const [timeStart, setTimeStart] = useState(initialTimeStart);
  const [timeEnd, setTimeEnd] = useState(initialTimeEnd);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(shift?.jobId || defaultJob?.id || null);
  const [breakMinutes, setBreakMinutes] = useState(shift ? shift.breakMinutes.toString() : (defaultJob?.defaultBreakMinutes?.toString() || settings.defaultBreakMinutes.toString()));
  const [hourlyWage, setHourlyWage] = useState(shift ? shift.hourlyWage.toString() : (defaultJob?.defaultHourlyWage?.toString() || settings.defaultHourlyWage.toString()));
  const [notes, setNotes] = useState(shift ? shift.notes : '');
  const [shiftType, setShiftType] = useState<ShiftType>(shift?.isAnnualLeave ? 'annual' : shift?.isSickLeave ? 'sick' : shift?.isOvertime ? 'overtime' : 'regular');
  const [annualLeaveHours, setAnnualLeaveHours] = useState(shift?.annualLeaveHours?.toString() || '');
  const [sickLeaveHoursInput, setSickLeaveHoursInput] = useState(shift?.sickLeaveHours?.toString() || '');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(shift?.photoUrl);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [reminder1h, setReminder1h] = useState(shift?.reminders?.includes(60) ?? false);
  const [reminder30m, setReminder30m] = useState(shift?.reminders?.includes(30) ?? false);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date(baseDate)));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation(settings.language);

  const isAnnualLeave = shiftType === 'annual';
  const isSickLeave = shiftType === 'sick';
  const selectedJob = selectedJobId ? localJobs.find(j => j.id === selectedJobId) : null;

  const handleJobChange = (jobId: string | null) => {
    setSelectedJobId(jobId);
    if (jobId) {
      const job = localJobs.find(j => j.id === jobId);
      if (job) {
        setHourlyWage(job.defaultHourlyWage.toString());
        setBreakMinutes(job.defaultBreakMinutes.toString());
      }
    }
  };

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

  const previewStartTime = getStartDateTime(selectedDates[0] || initialDate, timeStart);
  const previewEndTime = getEndDateTime(selectedDates[0] || initialDate, timeStart, timeEnd);
  
  const calculatedHours = calculatePaidHours(
    previewStartTime,
    previewEndTime,
    parseInt(breakMinutes) || 0
  );

  const finalPaidHours = isAnnualLeave && annualLeaveHours !== '' 
    ? parseFloat(annualLeaveHours) || 0 
    : isSickLeave
      ? Math.max(0, calculatedHours - (sickLeaveHoursInput !== '' ? parseFloat(sickLeaveHoursInput) || 0 : 0))
      : calculatedHours;

  const calendarDays = useMemo(() => {
    const firstDay = startOfMonth(currentMonth);
    const weekStart = startOfWeek(firstDay, { weekStartsOn: settings.weekStartsOn ?? 1 });
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [currentMonth, settings.weekStartsOn]);

  const handleDateSelect = async (date: Date) => {
    await haptic.selection();
    const dateStr = format(date, 'yyyy-MM-dd');
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
    setBaseDate(dateStr);
  };

  const handleSave = async () => {
    await haptic.success();
    
    const reminders: number[] = [];
    if (reminder1h) reminders.push(60);
    if (reminder30m) reminders.push(30);
    
    const shiftsToSave: Shift[] = selectedDates.map(dateStr => {
      return {
        id: isEditing ? shift.id : uuidv4(),
        startTime: new Date(getStartDateTime(dateStr, timeStart)).toISOString(),
        endTime: new Date(getEndDateTime(dateStr, timeStart, timeEnd)).toISOString(),
        breakMinutes: parseInt(breakMinutes) || 0,
        hourlyWage: parseFloat(hourlyWage) || 0,
        notes,
        isAnnualLeave: shiftType === 'annual',
        annualLeaveHours: shiftType === 'annual' ? (annualLeaveHours !== '' ? parseFloat(annualLeaveHours) : calculatedHours) : undefined,
        isSickLeave: shiftType === 'sick',
        sickLeaveHours: shiftType === 'sick' ? (sickLeaveHoursInput !== '' ? parseFloat(sickLeaveHoursInput) : 0) : undefined,
        isOvertime: shiftType === 'overtime',
        photoUrl,
        reminders,
        jobId: selectedJobId,
      };
    });

    if (isEditing && shift.alarmIds && shift.alarmIds.length > 0) {
      await cancelAlarms(shift.alarmIds);
    }

    if (reminders.length > 0) {
      for (let i = 0; i < shiftsToSave.length; i++) {
        const alarmIds = await scheduleShiftAlarms(
          shiftsToSave[i].id,
          shiftsToSave[i].startTime,
          reminders,
          settings.language
        );
        shiftsToSave[i].alarmIds = alarmIds;
      }
    }

    onSave(shiftsToSave);
  };

  const handleTakePhoto = async () => {
    await haptic.light();
    setShowPhotoOptions(false);
    try {
      const { Camera } = await import('@capacitor/camera');
      const { CameraResultType, CameraSource } = await import('@capacitor/camera');
      
      const permission = await Camera.requestPermissions({ permissions: ['camera'] });
      
      if (permission.camera !== 'granted') {
        console.error('Camera permission not granted');
        return;
      }
      
      const photo = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
        correctOrientation: true,
      });
      setPhotoUrl(photo.dataUrl);
    } catch (error: any) {
      console.error('Camera error:', error);
    }
  };

  const handleChooseFromGallery = async () => {
    await haptic.light();
    setShowPhotoOptions(false);
    try {
      const { Camera } = await import('@capacitor/camera');
      const { CameraResultType, CameraSource } = await import('@capacitor/camera');
      
      const photo = await Camera.getPhoto({
        quality: 70,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });
      setPhotoUrl(photo.dataUrl);
    } catch (error) {
      console.error('Gallery error:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoUrl(e.target?.result as string);
        setShowPhotoOptions(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    await haptic.light();
    setPhotoUrl(undefined);
    setShowPhotoOptions(false);
  };

  const handleCancel = async () => {
    await haptic.light();
    onCancel();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-light)] text-slate-900 dark:text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-4 pb-2 bg-white dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <X size={20} className="text-slate-600 dark:text-gray-400" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100">{isEditing ? t.editShift : t.addShift}</h1>
        </div>
      </header>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
        {/* Job Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">Job Assignment</label>
          <div className="relative">
            <select 
              value={selectedJobId || ''}
              onChange={(e) => handleJobChange(e.target.value || null)}
              className="w-full appearance-none bg-slate-50 dark:bg-gray-700 border-none rounded-xl px-4 py-4 text-slate-800 dark:text-gray-100 focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all font-medium"
            >
              <option value="">{t.noJob}</option>
              {localJobs.map((job) => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown size={20} />
            </div>
          </div>
        </div>

        {/* Date Picker Section */}
        <div>
          <label className="block text-sm font-semibold text-slate-500 dark:text-gray-400 mb-2 ml-1 uppercase tracking-wider">Shift Date</label>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} 
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-600" />
              </button>
              <span className="font-bold text-slate-800 dark:text-gray-100 text-lg">{format(currentMonth, 'MMMM yyyy')}</span>
              <button 
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} 
                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
              >
                <ChevronRight size={20} className="text-slate-600" />
              </button>
            </div>
            
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
              {(() => {
                const weekStartsOn = settings.weekStartsOn ?? 1;
                const reorderedDays = [...t.weekDays.slice(weekStartsOn), ...t.weekDays.slice(0, weekStartsOn)];
                return reorderedDays.map(day => (
                  <div key={day}>{day}</div>
                ));
              })()}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((date, index) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isSelected = selectedDates.includes(dateStr);
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isSelectedDate = isSelected;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!isCurrentMonth) setCurrentMonth(startOfMonth(date));
                      handleDateSelect(date);
                    }}
                    className={`aspect-square flex items-center justify-center rounded-full font-medium transition-colors ${
                      isSelectedDate 
                        ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30' 
                        : isCurrentMonth 
                          ? isToday(date)
                            ? 'bg-[var(--color-sakura)] text-slate-800 hover:bg-slate-100'
                            : 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300'
                    }`}
                  >
                    {format(date, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time Pickers */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">Start Time</label>
            <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-2 flex items-center justify-center">
              <input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="bg-transparent border-none text-center text-xl font-bold text-slate-800 dark:text-gray-100 outline-none w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-500 dark:text-gray-400 mb-2 ml-1 uppercase tracking-wider">End Time</label>
            <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-2 flex items-center justify-center">
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="bg-transparent border-none text-center text-xl font-bold text-slate-800 dark:text-gray-100 outline-none w-full"
              />
            </div>
          </div>
        </div>

        {/* Shift Type */}
        <div>
          <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">Shift Type</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { haptic.selection(); setShiftType('regular'); }}
              className={`px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                shiftType === 'regular'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              Regular Shift
            </button>
            <button
              onClick={() => { haptic.selection(); setShiftType('overtime'); }}
              className={`px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                shiftType === 'overtime'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              Overtime
            </button>
            <button
              onClick={() => { haptic.selection(); setShiftType('annual'); }}
              className={`px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                shiftType === 'annual'
                  ? 'border-purple-500 bg-purple-50 text-purple-600'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              Annual Leave
            </button>
            <button
              onClick={() => { haptic.selection(); setShiftType('sick'); }}
              className={`px-4 py-2 rounded-full border-2 font-semibold text-sm transition-all ${
                shiftType === 'sick'
                  ? 'border-red-500 bg-red-50 text-red-600'
                  : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}
            >
              Sick Leave
            </button>
          </div>
        </div>

        {/* Annual/Sick Leave Hours */}
        {(shiftType === 'annual' || shiftType === 'sick') && (
          <div className="animate-fade-in">
            <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">
              {shiftType === 'annual' ? t.useHours : 'Sick Leave (Unpaid Hours)'}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={shiftType === 'annual' ? annualLeaveHours : sickLeaveHoursInput}
              onChange={(e) => shiftType === 'annual' ? setAnnualLeaveHours(e.target.value) : setSickLeaveHoursInput(e.target.value)}
              placeholder={`${t.default}: ${shiftType === 'annual' ? calculatedHours.toFixed(1) : 0}`}
              className="w-full p-4 bg-slate-50 dark:bg-gray-700 border-none rounded-xl text-slate-800 dark:text-gray-100 font-medium"
            />
          </div>
        )}

        {/* Break & Wage */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t.breakTime}</label>
            <input
              type="number"
              min="0"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-gray-700 border-none rounded-xl text-slate-800 dark:text-gray-100 font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t.hourlyWage}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-gray-700 border-none rounded-xl text-slate-800 dark:text-gray-100 font-medium"
            />
          </div>
        </div>

        {/* Hours Summary */}
        <div className="bg-[var(--color-primary)]/5 rounded-xl p-5 border border-[var(--color-primary)]/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">{t.dailyPaidHours}</div>
              <div className="text-xs text-slate-400 mt-1">
                {!isAnnualLeave && `+${calculateAnnualLeaveHours(finalPaidHours).toFixed(2)}h ${t.earnedLeave}`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[var(--color-primary)]">{finalPaidHours.toFixed(1)}<span className="text-lg">h</span></div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t.notes}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t.notesPlaceholder}
            className="w-full p-4 bg-slate-50 dark:bg-gray-700 border-none rounded-xl text-slate-800 dark:text-gray-100 font-medium resize-none"
          />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t.photo}</label>
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="Shift photo" className="w-full h-48 object-cover rounded-xl" />
              <button
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                className="w-full p-6 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[var(--color-primary)] transition-colors"
              >
                <ImagePlus size={32} className="text-slate-400" />
                <span className="text-sm text-slate-500">{t.addPhoto}</span>
              </button>
              
              {showPhotoOptions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-10 animate-scale-in">
                  <button
                    onClick={handleTakePhoto}
                    className="w-full px-4 py-3.5 text-left text-sm font-medium flex items-center gap-3 bg-[var(--color-primary)] text-white"
                  >
                    <Camera size={18} /> {t.takePhoto}
                  </button>
                  <button
                    onClick={handleChooseFromGallery}
                    className="w-full px-4 py-3.5 text-left text-sm font-medium flex items-center gap-3 bg-slate-50 text-slate-700"
                  >
                    <Images size={18} /> {t.chooseFromGallery}
                  </button>
                </div>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Reminders */}
        <div>
          <label className="block text-sm font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">{t.reminders}</label>
          <div className="flex gap-2">
            <button
              onClick={() => { haptic.selection(); setReminder1h(!reminder1h); }}
              className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                reminder1h
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.reminder1h}
            </button>
            <button
              onClick={() => { haptic.selection(); setReminder30m(!reminder30m); }}
              className={`flex-1 py-3 rounded-xl font-medium text-sm transition-all ${
                reminder30m
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.reminder30m}
            </button>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-slate-100 dark:border-gray-700 flex gap-4 bg-white dark:bg-gray-800">
        <button 
          onClick={handleCancel}
          className="flex-1 py-4 px-6 rounded-[24px] bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          disabled={selectedDates.length === 0}
          className="flex-1 py-4 px-6 rounded-[24px] bg-[var(--color-action)] text-emerald-900 font-bold shadow-lg shadow-emerald-100 hover:brightness-105 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          Save Shift
        </button>
      </div>
    </div>
  );
}
