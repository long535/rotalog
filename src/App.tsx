import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import ShiftsList from './components/ShiftsList';
import ShiftForm from './components/ShiftForm';
import SettingsModal from './components/SettingsModal';
import { useAppStore } from './store';
import { Shift } from './types';
import { format, parseISO } from 'date-fns';
import { calculateWages, calculateAnnualLeaveHours, getShiftPaidHours, createNotificationChannels, cancelAlarms } from './utils';
import { useTranslation } from './i18n';

type View = 'LIST' | 'FORM' | 'HISTORY' | 'STATS';

export default function App() {
  const { shifts, settings, setSettings, timer, startTimer, stopTimer, pauseTimer, resumeTimer, addShift, addShifts, updateShift, deleteShift, duplicateShift, addJob, updateJob, deleteJob, setDefaultJob } = useAppStore();
  const [view, setView] = useState<View>('LIST');
  const [editingShift, setEditingShift] = useState<Shift | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const t = useTranslation(settings.language);

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      createNotificationChannels();
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const stopAlarmTimer = async () => {
      console.log('stopAlarmTimer called');
      if (timer.isActive && timer.notificationIds.length > 0) {
        await cancelAlarms(timer.notificationIds);
        stopTimer();
        console.log('Timer stopped due to alarm dismissed');
      }
    };

    (window as any).stopAlarmTimer = stopAlarmTimer;

    const checkAndStopTimer = async () => {
      try {
        const { value } = await Preferences.get({ key: 'alarmDismissed' });
        if (value === 'true') {
          await Preferences.remove({ key: 'alarmDismissed' });
          if (timer.isActive && timer.notificationIds.length > 0) {
            await cancelAlarms(timer.notificationIds);
            stopTimer();
            console.log('Timer stopped due to alarm dismissed');
          }
        }
      } catch (e) {
        console.error('Error checking alarmDismissed:', e);
      }
    };

    const listener = CapApp.addListener('resume', () => {
      checkAndStopTimer();
    });

    // Also check immediately when component mounts
    checkAndStopTimer();

    return () => {
      listener.then(l => l.remove());
    };
  }, [timer, stopTimer]);

  const handleAdd = () => {
    setEditingShift(undefined);
    setView('FORM');
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setView('FORM');
  };

  const handleSaveShifts = (shiftsToSave: Shift[]) => {
    if (editingShift) {
      updateShift(shiftsToSave[0]);
    } else {
      addShifts(shiftsToSave);
    }
    setView('LIST');
  };

  const handleDuplicate = (id: string) => {
    duplicateShift(id, uuidv4());
  };

  const handleExportCSV = async () => {
    const headers = ['Date', 'Start Time', 'End Time', 'Break (min)', 'Paid Hours', 'Is Annual Leave', 'Annual Leave Used (h)', 'Annual Leave Earned (h)', 'Hourly Wage', 'Wages', 'Notes'];
    const rows = shifts.map(s => {
      const paidHours = getShiftPaidHours(s);
      const annualLeaveEarned = s.isAnnualLeave ? 0 : calculateAnnualLeaveHours(paidHours);
      const annualLeaveUsed = s.isAnnualLeave ? paidHours : 0;
      const wages = calculateWages(paidHours, s.hourlyWage);
      return [
        format(parseISO(s.startTime), 'yyyy-MM-dd'),
        format(parseISO(s.startTime), 'HH:mm'),
        format(parseISO(s.endTime), 'HH:mm'),
        s.breakMinutes,
        paidHours.toFixed(2),
        s.isAnnualLeave ? 'Yes' : 'No',
        annualLeaveUsed.toFixed(2),
        annualLeaveEarned.toFixed(2),
        s.hourlyWage,
        wages.toFixed(2),
        `"${(s.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const filename = `shifts_export_${format(new Date(), 'yyyyMMdd')}.csv`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({
          path: `Documents/${filename}`,
          data: btoa(unescape(encodeURIComponent(csvContent))),
          directory: Directory.External,
          recursive: true
        });
        alert('已儲存到 Documents/' + filename);
      } catch (err) {
        console.error('Export error:', err);
        try {
          await Filesystem.writeFile({
            path: filename,
            data: btoa(unescape(encodeURIComponent(csvContent))),
            directory: Directory.Documents
          });
          alert('已儲存: ' + filename);
        } catch (err2) {
          console.error('Export fallback error:', err2);
          alert('匯出失敗: ' + (err2 as Error).message);
        }
      }
    } else {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const parseCSVContent = (content: string): number => {
    const cleanContent = content.replace(/^\uFEFF/, '');
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length <= 1) return 0;

    const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const dateIdx = csvHeaders.indexOf('Date');
    const startIdx = csvHeaders.indexOf('Start Time');
    const endIdx = csvHeaders.indexOf('End Time');
    const breakIdx = csvHeaders.indexOf('Break (min)');
    const isLeaveIdx = csvHeaders.indexOf('Is Annual Leave');
    const leaveUsedIdx = csvHeaders.indexOf('Annual Leave Used (h)');
    const wageIdx = csvHeaders.indexOf('Hourly Wage');
    const notesIdx = csvHeaders.indexOf('Notes');

    const importedShifts: Shift[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      const values: string[] = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            currentValue += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue);

      if (dateIdx !== -1 && startIdx !== -1 && endIdx !== -1 && values.length > Math.max(dateIdx, startIdx, endIdx)) {
        const dateStr = values[dateIdx];
        const startTimeStr = values[startIdx];
        const endTimeStr = values[endIdx];
        const breakMinutes = breakIdx !== -1 ? parseInt(values[breakIdx]) || 0 : 0;
        const isAnnualLeave = isLeaveIdx !== -1 ? values[isLeaveIdx] === 'Yes' : false;
        const annualLeaveHours = isAnnualLeave && leaveUsedIdx !== -1 ? parseFloat(values[leaveUsedIdx]) || undefined : undefined;
        const hourlyWage = wageIdx !== -1 ? parseFloat(values[wageIdx]) || 0 : 0;
        const notes = notesIdx !== -1 ? values[notesIdx] || '' : '';

        try {
          const startDateTime = `${dateStr}T${startTimeStr}:00`;
          let endDateStr = dateStr;
          if (endTimeStr < startTimeStr) {
            const date = parseISO(dateStr);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            endDateStr = format(nextDay, 'yyyy-MM-dd');
          }
          const endDateTime = `${endDateStr}T${endTimeStr}:00`;

          if (!isNaN(new Date(startDateTime).getTime()) && !isNaN(new Date(endDateTime).getTime())) {
            importedShifts.push({
              id: uuidv4(),
              startTime: new Date(startDateTime).toISOString(),
              endTime: new Date(endDateTime).toISOString(),
              breakMinutes,
              hourlyWage,
              notes,
              isAnnualLeave,
              annualLeaveHours
            });
          }
        } catch (err) {
          console.error('Error parsing row:', i, err);
        }
      }
    }

    if (importedShifts.length > 0) {
      addShifts(importedShifts);
    }
    return importedShifts.length;
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      
      const count = parseCSVContent(content);
      if (count > 0) {
        alert(t.importSuccess.replace('{count}', count.toString()));
      } else {
        alert(t.importError);
      }
    };
    reader.readAsText(file);
    
    event.target.value = '';
  };

  return (
    <div className="h-screen w-full max-w-md mx-auto bg-white dark:bg-gray-900 shadow-2xl overflow-hidden relative sm:border-x sm:border-gray-200 dark:sm:border-gray-800">
      {view === 'LIST' || view === 'HISTORY' || view === 'STATS' ? (
        <ShiftsList
          shifts={shifts}
          settings={settings}
          timer={timer}
          pageView={view}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={deleteShift}
          onDuplicate={handleDuplicate}
          onOpenSettings={() => setShowSettings(true)}
          onShowHistory={() => setView('HISTORY')}
          onShowStats={() => setView('STATS')}
          onBackToList={() => setView('LIST')}
          onStartTimer={startTimer}
          onStopTimer={stopTimer}
          onPauseTimer={pauseTimer}
          onResumeTimer={resumeTimer}
          jobs={settings.jobs}
        />
      ) : (
        <ShiftForm
          shift={editingShift}
          settings={settings}
          onSave={handleSaveShifts}
          onCancel={() => setView('LIST')}
          jobs={settings.jobs}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={setSettings}
          onClose={() => setShowSettings(false)}
          jobs={settings.jobs}
          onAddJob={addJob}
          onUpdateJob={updateJob}
          onDeleteJob={deleteJob}
          onSetDefaultJob={setDefaultJob}
          onExport={handleExportCSV}
          onImport={handleImportCSV}
        />
      )}
    </div>
  );
}
