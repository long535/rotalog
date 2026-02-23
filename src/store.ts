import { useState, useEffect } from 'react';
import { Shift, AppSettings } from './types';

const SHIFTS_KEY = 'shifts_data';
const SETTINGS_KEY = 'shifts_settings';

const defaultSettings: AppSettings = {
  defaultHourlyWage: 50,
  currency: 'HKD',
  defaultBreakMinutes: 60,
  theme: 'dark',
  enableUKTaxes: false,
  language: 'zh',
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

  return { shifts, settings, setSettings, addShift, addShifts, updateShift, deleteShift, duplicateShift };
}
