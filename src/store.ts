import { useState, useEffect } from 'react';
import { Shift, AppSettings, TimerState } from './types';
import { cancelAlarms, scheduleBreakTimer } from './utils';
import { useTranslation } from './i18n';

const SHIFTS_KEY = 'shifts_data';
const SETTINGS_KEY = 'shifts_settings';
const TIMER_KEY = 'timer_state';

const defaultSettings: AppSettings = {
  defaultHourlyWage: 50,
  currency: 'HKD',
  defaultBreakMinutes: 60,
  theme: 'dark',
  enableUKTaxes: false,
  language: 'zh',
  weekStartsOn: 1,
};

const defaultTimerState: TimerState = {
  isActive: false,
  startedAt: null,
  durationMinutes: 0,
  notificationIds: [],
  isPaused: false,
  pausedRemainingSeconds: null,
};

export function useAppStore() {
  const [shifts, setShifts] = useState<Shift[]>(() => {
    const saved = localStorage.getItem(SHIFTS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const [timer, setTimer] = useState<TimerState>(() => {
    const saved = localStorage.getItem(TIMER_KEY);
    return saved ? JSON.parse(saved) : defaultTimerState;
  });

  useEffect(() => {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  }, [shifts]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  }, [timer]);

  const addShift = (shift: Shift) => setShifts([...shifts, shift]);
  const addShifts = (newShifts: Shift[]) => setShifts([...shifts, ...newShifts]);
  const updateShift = (updated: Shift) => setShifts(shifts.map(s => s.id === updated.id ? updated : s));
  const deleteShift = (id: string) => setShifts(shifts.filter(s => s.id !== id));
  const duplicateShift = (id: string, newId: string) => {
    const shift = shifts.find(s => s.id === id);
    if (shift) {
      setShifts([...shifts, { ...shift, id: newId }]);
    }
  };

  const startTimer = (durationMinutes: number, notificationIds: number[]) => {
    setTimer({
      isActive: true,
      startedAt: new Date().toISOString(),
      durationMinutes,
      notificationIds,
    });
  };

  const stopTimer = () => {
    setTimer(defaultTimerState);
  };

  const pauseTimer = async (remainingSeconds: number) => {
    const currentTimer = timer;
    if (currentTimer.notificationIds.length > 0) {
      await cancelAlarms(currentTimer.notificationIds);
    }
    setTimer({
      ...currentTimer,
      isPaused: true,
      pausedRemainingSeconds: remainingSeconds,
      notificationIds: [],
    });
  };

  const resumeTimer = async () => {
    const currentTimer = timer;
    if (!currentTimer.isPaused || currentTimer.pausedRemainingSeconds === null) return;

    const lang = settings.language;
    const remainingMinutes = Math.ceil(currentTimer.pausedRemainingSeconds / 60);
    
    try {
      const { endId } = await scheduleBreakTimer(remainingMinutes, lang);
      const validIds = [endId].filter(id => id > 0);
      
      setTimer({
        isActive: true,
        startedAt: new Date().toISOString(),
        durationMinutes: remainingMinutes,
        notificationIds: validIds,
        isPaused: false,
        pausedRemainingSeconds: null,
      });
    } catch (error) {
      console.error('Failed to resume timer:', error);
    }
  };

  return { 
    shifts, 
    settings, 
    setSettings, 
    timer,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    addShift, 
    addShifts, 
    updateShift, 
    deleteShift, 
    duplicateShift 
  };
}
