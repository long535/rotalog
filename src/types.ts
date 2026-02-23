export interface Shift {
  id: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  breakMinutes: number;
  hourlyWage: number;
  notes: string;
  isAnnualLeave?: boolean;
  annualLeaveHours?: number;
}

export interface AppSettings {
  defaultHourlyWage: number;
  currency: string;
  defaultBreakMinutes: number;
  theme: 'light' | 'dark';
  enableUKTaxes?: boolean;
  language?: 'zh' | 'en';
}
