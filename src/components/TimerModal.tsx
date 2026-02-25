import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, RotateCcw, Timer } from 'lucide-react';
import { TimerState } from '../types';
import { useTranslation } from '../i18n';
import { haptic } from '../haptics';
import { scheduleBreakTimer, cancelAlarms } from '../utils';

interface Props {
  timer: TimerState;
  language?: 'zh' | 'en';
  onStart: (durationMinutes: number, notificationIds: number[]) => void;
  onStop: () => void;
  onClose: () => void;
}

export default function TimerModal({ timer, language = 'zh', onStart, onStop, onClose }: Props) {
  const t = useTranslation(language);
  const [selectedDuration, setSelectedDuration] = useState<number>(60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timer.isActive && timer.startedAt) {
      const startedAt = new Date(timer.startedAt).getTime();
      const totalSeconds = timer.durationMinutes * 60;

      const updateRemaining = () => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const remaining = Math.max(0, totalSeconds - elapsed);
        setRemainingSeconds(remaining);

        if (remaining === 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        }
      };

      updateRemaining();
      intervalRef.current = setInterval(updateRemaining, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setRemainingSeconds(selectedDuration * 60 - 20);
    }
  }, [timer.isActive, timer.startedAt, timer.durationMinutes, selectedDuration]);

  const handleStart = async () => {
    try {
      await haptic.success();
      
      const actualDuration = selectedDuration * 60 - 20;
      const { endId } = await scheduleBreakTimer(selectedDuration, language);
      const validIds = [endId].filter(id => id > 0);
      
      onStart(Math.floor(actualDuration / 60), validIds);
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const handleStop = async () => {
    await haptic.medium();
    
    if (timer.notificationIds.length > 0) {
      await cancelAlarms(timer.notificationIds);
    }
    
    onStop();
  };

  const handleSelectDuration = async (minutes: number) => {
    await haptic.selection();
    setSelectedDuration(minutes);
    if (!timer.isActive) {
      setRemainingSeconds(minutes * 60 - 20);
    }
  };

  const handleClose = async () => {
    await haptic.light();
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = timer.isActive && timer.startedAt
    ? ((timer.durationMinutes * 60 - 20 - remainingSeconds) / (timer.durationMinutes * 60 - 20)) * 100
    : 0;

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" 
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-gray-800/95 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Timer size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              {t.breakTimer}
            </h2>
          </div>
          <button onClick={handleClose} className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col items-center">
          <div className="relative w-64 h-64 mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-white font-mono">
                {formatTime(remainingSeconds)}
              </div>
              {timer.isActive && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {selectedDuration === 60 ? '59:40' : selectedDuration === 30 ? '29:40' : '0:40'} {t.min}
                </div>
              )}
            </div>
          </div>

          {!timer.isActive && (
            <div className="flex gap-3 mb-6">
              <button
                onClick={() => handleSelectDuration(60)}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  selectedDuration === 60
                    ? 'gradient-primary text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                59:40
              </button>
              <button
                onClick={() => handleSelectDuration(30)}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  selectedDuration === 30
                    ? 'gradient-primary text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                29:40
              </button>
              <button
                onClick={() => handleSelectDuration(1)}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  selectedDuration === 1
                    ? 'gradient-primary text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                0:40
              </button>
            </div>
          )}

          <div className="flex gap-3 w-full">
            {!timer.isActive ? (
              <button
                onClick={handleStart}
                className="flex-1 py-4 gradient-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Play size={24} fill="white" />
                {t.startTimer}
              </button>
            ) : (
              <>
                <button
                  onClick={handleStop}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <RotateCcw size={24} />
                  {t.resetTimer}
                </button>
              </>
            )}
          </div>

          {timer.isActive && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t.timerWarningDesc}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
