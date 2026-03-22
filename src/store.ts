import { useState, useEffect } from 'react';
import { Shift, AppSettings, TimerState, Job } from './types';
import { cancelAlarms, scheduleBreakTimer } from './utils';
import { useTranslation } from './i18n';
import { v4 as uuidv4 } from 'uuid';

const SHIFTS_KEY = 'shifts_data';
const SETTINGS_KEY = 'shifts_settings';
const TIMER_KEY = 'timer_state';

const defaultSettings: AppSettings = {
  defaultHourlyWage: 50,
  currency: 'HKD',
  defaultBreakMinutes: 60,
  theme: 'dark',
  enableUKTaxes: false,
  language: 'en',
  weekStartsOn: 1,
  jobs: [],
  defaultJobId: null,
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
    const parsedShifts: Shift[] = saved ? JSON.parse(saved) : [];
    
    // Auto-migrate old shifts if there is exactly one job
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    const settingsObj = savedSettings ? JSON.parse(savedSettings) : null;
    if (settingsObj && settingsObj.jobs && settingsObj.jobs.length === 1) {
      const singleJobId = settingsObj.jobs[0].id;
      let migrated = false;
      const updatedShifts = parsedShifts.map(s => {
        if (!s.jobId) {
          migrated = true;
          return { ...s, jobId: singleJobId };
        }
        return s;
      });
      
      if (migrated) {
        localStorage.setItem(SHIFTS_KEY, JSON.stringify(updatedShifts));
        return updatedShifts;
      }
    }
    
    return parsedShifts;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const parsed = saved ? JSON.parse(saved) : defaultSettings;
    return {
      ...defaultSettings,
      ...parsed,
      jobs: parsed.jobs || [],
      defaultJobId: parsed.defaultJobId || null,
    };
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
    document.documentElement.classList.remove('dark', 'color02');
    if (settings.theme !== 'light') {
      document.documentElement.classList.add(settings.theme);
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

  const addJob = (job: Omit<Job, 'id'>) => {
    const newJob: Job = { ...job, id: uuidv4() };
    setSettings(prev => ({
      ...prev,
      jobs: [...prev.jobs, newJob],
    }));
    return newJob;
  };

  const updateJob = (updated: Job) => {
    setSettings(prev => ({
      ...prev,
      jobs: prev.jobs.map(j => j.id === updated.id ? updated : j),
    }));
  };

  const deleteJob = (id: string) => {
    setSettings(prev => ({
      ...prev,
      jobs: prev.jobs.filter(j => j.id !== id),
      defaultJobId: prev.defaultJobId === id ? null : prev.defaultJobId,
    }));
  };

  const setDefaultJob = (id: string | null) => {
    setSettings(prev => ({
      ...prev,
      defaultJobId: id,
    }));
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
    duplicateShift,
    addJob,
    updateJob,
    deleteJob,
    setDefaultJob,
  };
}
