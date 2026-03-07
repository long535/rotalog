import { registerPlugin } from '@capacitor/core';

export interface SystemAlarmPlugin {
  schedule(options: ScheduleOptions): Promise<ScheduleResult>;
  cancel(options: CancelOptions): Promise<CancelResult>;
  cancelAll(options: CancelAllOptions): Promise<CancelAllResult>;
  hasPermission(): Promise<PermissionResult>;
  requestPermission(): Promise<PermissionRequestResult>;
}

export interface ScheduleOptions {
  id: number;
  triggerAt: string;
  title?: string;
  body?: string;
  shiftId?: string;
}

export interface ScheduleResult {
  success: boolean;
  alarmId?: number;
  triggerTime?: number;
  error?: string;
  message?: string;
  method?: string;
}

export interface CancelOptions {
  id: number;
}

export interface CancelResult {
  success: boolean;
}

export interface CancelAllOptions {
  ids: number[];
}

export interface CancelAllResult {
  success: boolean;
  cancelledCount?: number;
}

export interface PermissionResult {
  granted: boolean;
  reason?: string;
}

export interface PermissionRequestResult {
  requested: boolean;
  granted: boolean;
  message?: string;
}

const SystemAlarm = registerPlugin<SystemAlarmPlugin>('SystemAlarm');

export default SystemAlarm;
