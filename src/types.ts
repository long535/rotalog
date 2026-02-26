export interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hourlyWage: number;
  notes: string;
  isAnnualLeave?: boolean;
  annualLeaveHours?: number;
  photoUrl?: string;
  reminders?: number[];
  alarmIds?: number[];
  jobId?: string | null;
}

export interface Job {
  id: string;
  name: string;
  defaultHourlyWage: number;
  defaultBreakMinutes: number;
  color: string;
}

export interface AppSettings {
  defaultHourlyWage: number;
  currency: string;
  defaultBreakMinutes: number;
  theme: 'light' | 'dark';
  enableUKTaxes?: boolean;
  language?: 'zh' | 'en';
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  jobs: Job[];
  defaultJobId: string | null;
}

export interface TimerState {
  isActive: boolean;
  startedAt: string | null; // ISO string
  durationMinutes: number;
  notificationIds: number[];
  isPaused: boolean;
  pausedRemainingSeconds: number | null;
}
