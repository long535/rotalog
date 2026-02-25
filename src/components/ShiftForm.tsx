import React, { useState, useRef } from 'react';
import { ArrowLeft, Check, Info, Clock, DollarSign, FileText, Calendar, Camera, Image, X, Bell } from 'lucide-react';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Shift, AppSettings } from '../types';
import { calculatePaidHours, calculateAnnualLeaveHours, scheduleShiftAlarms, cancelAlarms } from '../utils';
import { useTranslation } from '../i18n';
import { haptic } from '../haptics';

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
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(shift?.photoUrl);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [reminder1h, setReminder1h] = useState(shift?.reminders?.includes(60) ?? false);
  const [reminder30m, setReminder30m] = useState(shift?.reminders?.includes(30) ?? false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation(settings.language);

  const referenceDate = parseISO(baseDate);
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: settings.weekStartsOn ?? 1 });
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

  const previewStartTime = getStartDateTime(selectedDates[0] || initialDate, timeStart);
  const previewEndTime = getEndDateTime(selectedDates[0] || initialDate, timeStart, timeEnd);
  
  const calculatedHours = calculatePaidHours(
    previewStartTime,
    previewEndTime,
    parseInt(breakMinutes) || 0
  );

  const finalPaidHours = isAnnualLeave && annualLeaveHours !== '' ? parseFloat(annualLeaveHours) || 0 : calculatedHours;

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
        isAnnualLeave,
        annualLeaveHours: isAnnualLeave ? (annualLeaveHours !== '' ? parseFloat(annualLeaveHours) : calculatedHours) : undefined,
        photoUrl,
        reminders,
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
      if (error?.message) {
        console.error('Error message:', error.message);
      }
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

  const handleDateToggle = async (dateStr: string) => {
    await haptic.selection();
    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length > 1) {
        setSelectedDates(selectedDates.filter(d => d !== dateStr).sort());
      }
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100">
      <header className="flex items-center justify-between px-5 py-4 pt-safe glass border-b border-gray-200/50 dark:border-gray-700/50 z-10">
        <div className="flex items-center gap-3">
          <button onClick={handleCancel} className="p-2.5 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 rounded-xl transition-all active:scale-95">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-xl font-bold">{isEditing ? t.editShift : t.addShift}</h1>
        </div>
        <button 
          onClick={handleSave} 
          disabled={selectedDates.length === 0} 
          className="px-4 py-2 gradient-primary text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
        >
          <Check size={20} strokeWidth={2.5} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fade-in">
        {/* Date Selection Card */}
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-5 card-shadow border border-gray-100/50 dark:border-gray-700/50 space-y-5">
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Calendar size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">{t.date}</span>
            {selectedDates.length > 1 && (
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-full text-sm font-medium">
                {selectedDates.length} {t.days}
              </span>
            )}
          </div>
          
          {isEditing ? (
            <input 
              type="date" 
              value={selectedDates[0]} 
              onChange={(e) => setSelectedDates([e.target.value])}
              className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
            />
          ) : (
            <>
              <div>
                <input 
                  type="date" 
                  value={baseDate} 
                  onChange={(e) => {
                    setBaseDate(e.target.value);
                    setSelectedDates([e.target.value]);
                  }}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                />
              </div>
              <div className="flex justify-between gap-1.5">
                {weekDays.map((date, index) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const isSelected = selectedDates.includes(dateStr);
                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateToggle(dateStr)}
                      className={`flex-1 aspect-square max-w-[48px] rounded-2xl flex flex-col items-center justify-center text-sm transition-all duration-300 ${
                        isSelected 
                          ? 'gradient-primary text-white shadow-lg shadow-indigo-500/30 font-bold scale-105' 
                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium'
                      }`}
                    >
                      <span className="text-xs opacity-80">{weekDayLabels[index]}</span>
                      <span className="text-lg font-bold mt-0.5">{format(date, 'd')}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">{t.clickDayHint}</p>
            </>
          )}
        </div>

        {/* Annual Leave Card */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-5 card-shadow border border-indigo-100/50 dark:border-indigo-800/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-indigo-900 dark:text-indigo-100 text-lg">{t.annualLeaveLabel}</div>
              <div className="text-sm text-indigo-600 dark:text-indigo-300 mt-1">{t.annualLeaveDesc}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isAnnualLeave} onChange={(e) => setIsAnnualLeave(e.target.checked)} />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500"></div>
            </label>
          </div>
          {isAnnualLeave && (
            <div className="pt-4 border-t border-indigo-200/50 dark:border-indigo-700/50 animate-fade-in">
              <label className="block text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-2">{t.useHours}</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={annualLeaveHours}
                onChange={(e) => setAnnualLeaveHours(e.target.value)}
                placeholder={`${t.default}: ${calculatedHours.toFixed(1)}`}
                className="w-full p-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* Time Card */}
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-5 card-shadow border border-gray-100/50 dark:border-gray-700/50 space-y-5">
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Clock size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">{t.startTime} & {t.endTime}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t.startTime}</label>
              <input
                type="time"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-lg text-center"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t.endTime}</label>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-lg text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t.breakTime}</label>
            <input
              type="number"
              min="0"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 -mx-5 -mb-5 px-5 py-4 rounded-b-2xl">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium">
              <Info size={18} className="text-indigo-500" />
              {t.dailyPaidHours}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">{finalPaidHours.toFixed(1)}<span className="text-lg">h</span></div>
              {!isAnnualLeave && (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">+{calculateAnnualLeaveHours(finalPaidHours).toFixed(2)}h {t.earnedLeave}</div>
              )}
            </div>
          </div>
        </div>

        {/* Wage & Notes Card */}
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-5 card-shadow border border-gray-100/50 dark:border-gray-700/50 space-y-5">
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <DollarSign size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">{t.hourlyWage}</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{settings.currency}/hour</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 mb-3">
              <FileText size={18} className="text-gray-400" />
              <span className="font-medium">{t.notesOptional}</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
              placeholder={t.notesPlaceholder}
            />
          </div>
        </div>

        {/* Photo Card */}
        <div className="bg-white dark:bg-gray-800/90 rounded-2xl p-5 card-shadow border border-gray-100/50 dark:border-gray-700/50 space-y-5">
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <Camera size={20} className="text-white" />
            </div>
            <span className="font-semibold text-lg">{t.photo}</span>
          </div>
          
          {photoUrl ? (
            <div className="relative">
              <img 
                src={photoUrl} 
                alt="Shift photo" 
                className="w-full h-48 object-cover rounded-xl"
              />
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
                className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
              >
                <Camera size={32} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">{t.addPhoto}</span>
              </button>
              
              {showPhotoOptions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-10 animate-scale-in">
                  <button
                    onClick={handleTakePhoto}
                    className="w-full px-4 py-3.5 text-left text-sm font-medium flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                  >
                    <Camera size={18} /> {t.takePhoto}
                  </button>
                  <button
                    onClick={handleChooseFromGallery}
                    className="w-full px-4 py-3.5 text-left text-sm font-medium flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                  >
                    <Image size={18} /> {t.chooseFromGallery}
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

        {/* Reminders Card */}
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/30 dark:to-yellow-900/30 rounded-2xl p-5 card-shadow border border-orange-100/50 dark:border-orange-800/50 space-y-4">
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
              <Bell size={20} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-lg">{t.reminders}</div>
              <div className="text-sm text-orange-600 dark:text-orange-300">{t.remindersDesc}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700/50 transition-all">
              <input
                type="checkbox"
                checked={reminder1h}
                onChange={(e) => setReminder1h(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="font-medium">{t.reminder1h}</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-orange-50 dark:hover:bg-gray-700/50 transition-all">
              <input
                type="checkbox"
                checked={reminder30m}
                onChange={(e) => setReminder30m(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <span className="font-medium">{t.reminder30m}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
