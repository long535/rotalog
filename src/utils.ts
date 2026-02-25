import { differenceInMinutes, parseISO, addSeconds, subMinutes } from 'date-fns';
import { Shift } from './types';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import SystemAlarm from './plugins/SystemAlarm';

export function calculatePaidHours(startTime: string, endTime: string, breakMinutes: number): number {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const totalMinutes = differenceInMinutes(end, start);
  const paidMinutes = Math.max(0, totalMinutes - breakMinutes);
  return paidMinutes / 60;
}

export function getShiftPaidHours(shift: Shift): number {
  if (shift.isAnnualLeave && shift.annualLeaveHours !== undefined) {
    return shift.annualLeaveHours;
  }
  return calculatePaidHours(shift.startTime, shift.endTime, shift.breakMinutes);
}

export function calculateWages(paidHours: number, hourlyWage: number): number {
  return paidHours * hourlyWage;
}

export function calculateUKDeductions(grossPay: number, period: string) {
  if (period === 'ALL' || grossPay <= 0) return { tax: 0, ni: 0, pension: 0, netPay: grossPay };

  let taxThreshold = 0;
  let niThreshold = 0;
  let pensionThreshold = 0;

  if (period === 'WEEK') {
    taxThreshold = 242;
    niThreshold = 242;
    pensionThreshold = 120; // 24/25 rate
  } else if (period === 'MONTH') {
    taxThreshold = 1048;
    niThreshold = 1048;
    pensionThreshold = 520; // 24/25 rate
  } else if (period === 'YEAR') {
    taxThreshold = 12570;
    niThreshold = 12570;
    pensionThreshold = 6240;
  }

  // Basic Rate Tax 20%
  const tax = Math.max(0, (grossPay - taxThreshold) * 0.20);
  // NI 8% (24/25 rate)
  const ni = Math.max(0, (grossPay - niThreshold) * 0.08);
  // Workplace Pension 5% (Qualifying earnings)
  // Note: Some employers use 488 (23/24) or calculate differently, using 520 for 24/25
  const pension = Math.max(0, (grossPay - pensionThreshold) * 0.05);

  return {
    tax,
    ni,
    pension,
    netPay: grossPay - tax - ni - pension
  };
}

export function calculateAnnualLeaveHours(paidHours: number): number {
  return paidHours * 0.1207;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('zh-HK', { style: 'currency', currency }).format(amount);
}

let alarmIdCounter = Date.now();

export function generateAlarmId(): number {
  return ++alarmIdCounter;
}

export async function requestAlarmPermission(): Promise<boolean> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }
    
    const result = await SystemAlarm.hasPermission();
    console.log('Alarm permission check:', result);
    
    if (!result.granted) {
      console.log('Alarm permission not granted, requesting...');
      const requestResult = await SystemAlarm.requestPermission();
      console.log('Alarm permission request result:', requestResult);
      
      // Check again after requesting
      const recheck = await SystemAlarm.hasPermission();
      console.log('Alarm permission recheck:', recheck);
      return recheck.granted;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to request alarm permission:', error);
    return false;
  }
}

export async function scheduleShiftAlarms(
  shiftId: string,
  startTime: string,
  reminders: number[],
  lang: 'zh' | 'en' = 'zh'
): Promise<number[]> {
  if (reminders.length === 0) return [];

  if (!Capacitor.isNativePlatform()) {
    console.log('Not native platform, skipping alarm scheduling');
    return [];
  }

  // Check and request permission
  if (Capacitor.isNativePlatform()) {
    const permResult = await SystemAlarm.hasPermission();
    console.log('Alarm permission status:', permResult);
    
    if (!permResult.granted) {
      await SystemAlarm.requestPermission();
    }
  }

  const shiftStart = parseISO(startTime);
  const alarmIds: number[] = [];

  for (const minutesBefore of reminders) {
    const triggerTime = subMinutes(shiftStart, minutesBefore);
    
    if (triggerTime <= new Date()) {
      console.log(`Skipping alarm ${minutesBefore} min before - time has passed`);
      continue;
    }

    const id = generateAlarmId();
    
    const title = lang === 'zh' ? '上班提醒' : 'Work Reminder';
    const body = lang === 'zh' 
      ? `還有 ${minutesBefore} 分鐘要上班！`
      : `Shift starts in ${minutesBefore} minutes!`;

    try {
      const result = await SystemAlarm.schedule({
        id,
        triggerAt: triggerTime.toISOString(),
        title,
        body,
        shiftId,
      });
      
      if (result.success) {
        alarmIds.push(id);
        console.log(`Scheduled alarm ${id} for ${triggerTime.toISOString()}, method: ${result.method}`);
      } else {
        console.error('Failed to schedule alarm:', result.error, result.message);
      }
    } catch (error) {
      console.error('Failed to schedule alarm:', error);
    }
  }

  return alarmIds;
}

export async function cancelAlarms(alarmIds: number[]): Promise<void> {
  if (alarmIds.length === 0) return;

  if (!Capacitor.isNativePlatform()) {
    return;
  }
  
  try {
    await SystemAlarm.cancelAll({ ids: alarmIds });
    console.log(`Cancelled ${alarmIds.length} alarms`);
  } catch (error) {
    console.error('Failed to cancel alarms:', error);
  }
}

let notificationIdCounter = Date.now();

export function generateNotificationId(): number {
  return ++notificationIdCounter;
}

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

export async function scheduleBreakTimer(
  durationMinutes: number,
  lang: 'zh' | 'en' = 'zh'
): Promise<{ warningId: number; endId: number }> {
  const now = new Date();
  const endTime = addSeconds(now, durationMinutes * 60 - 20);

  const endId = generateAlarmId();

  const endTitle = lang === 'zh' ? '午休結束' : 'Break Ended';
  const endBody = lang === 'zh' ? '該上班了！' : 'Time to work!';

  if (!Capacitor.isNativePlatform()) {
    console.log('Not native platform, skipping break timer alarm');
    return { warningId: -1, endId };
  }

  // Always try to schedule - the plugin will handle permission fallbacks
  if (Capacitor.isNativePlatform()) {
    const permResult = await SystemAlarm.hasPermission();
    console.log('Alarm permission status:', permResult);
    
    if (!permResult.granted) {
      // Try to request permission anyway
      await SystemAlarm.requestPermission();
    }
  }

  try {
    const result = await SystemAlarm.schedule({
      id: endId,
      triggerAt: endTime.toISOString(),
      title: endTitle,
      body: endBody,
    });
    
    console.log('Break timer schedule result:', result);
    
    if (!result.success) {
      console.error('Failed to schedule break timer:', result.error, result.message);
    }
  } catch (error) {
    console.error('Failed to schedule break timer:', error);
  }

  return { warningId: -1, endId };
}

export async function cancelNotifications(notificationIds: number[]): Promise<void> {
  if (notificationIds.length === 0) return;
  
  try {
    await LocalNotifications.cancel({
      notifications: notificationIds.map(id => ({ id })),
    });
    console.log(`Cancelled ${notificationIds.length} notifications`);
  } catch (error) {
    console.error('Failed to cancel notifications:', error);
  }
}

export async function createNotificationChannels(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: 'shift-reminders',
      name: '上班提醒',
      description: '上班前的提醒通知',
      importance: 5,
      visibility: 1,
      sound: undefined,
      vibration: true,
      lights: true,
    });

    await LocalNotifications.createChannel({
      id: 'break-timer',
      name: '午休計時器',
      description: '午休計時器結束通知',
      importance: 5,
      visibility: 1,
      sound: undefined,
      vibration: true,
      lights: true,
    });
  } catch (error) {
    console.error('Failed to create notification channels:', error);
  }
}
