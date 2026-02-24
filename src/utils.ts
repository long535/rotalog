import { differenceInMinutes, parseISO, addSeconds } from 'date-fns';
import { Shift } from './types';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';

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

export async function scheduleShiftReminders(
  shiftId: string,
  startTime: string,
  reminders: number[],
  lang: 'zh' | 'en' = 'zh'
): Promise<number[]> {
  if (reminders.length === 0) return [];

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission not granted');
    return [];
  }

  const shiftStart = parseISO(startTime);
  const notifications: LocalNotificationSchema[] = [];
  const notificationIds: number[] = [];

  for (const minutesBefore of reminders) {
    const triggerTime = new Date(shiftStart.getTime() - minutesBefore * 60 * 1000);
    
    if (triggerTime <= new Date()) continue;

    const id = generateNotificationId();
    notificationIds.push(id);

    const title = lang === 'zh' ? '上班提醒' : 'Work Reminder';
    const timeStr = lang === 'zh' 
      ? `還有 ${minutesBefore} 分鐘要上班！`
      : `Shift starts in ${minutesBefore} minutes!`;

    notifications.push({
      id,
      title,
      body: timeStr,
      schedule: { at: triggerTime },
      sound: undefined,
      smallIcon: 'ic_stat_icon_config_sample',
      largeIcon: 'ic_launcher',
      channelId: 'shift-reminders',
    });
  }

  if (notifications.length > 0) {
    try {
      await LocalNotifications.schedule({
        notifications,
      });
      console.log(`Scheduled ${notifications.length} reminders for shift ${shiftId}`);
    } catch (error) {
      console.error('Failed to schedule reminders:', error);
    }
  }

  return notificationIds;
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

export async function scheduleBreakTimer(
  durationMinutes: number,
  lang: 'zh' | 'en' = 'zh'
): Promise<{ warningId: number; endId: number }> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission not granted');
    return { warningId: -1, endId: -1 };
  }

  const now = new Date();
  const warningTime = addSeconds(now, durationMinutes * 60 - 20);
  const endTime = addSeconds(now, durationMinutes * 60);

  const warningId = generateNotificationId();
  const endId = generateNotificationId();

  const notifications: LocalNotificationSchema[] = [];

  const warningTitle = lang === 'zh' ? '準備打卡' : 'Get Ready';
  const warningBody = lang === 'zh' ? '20 秒後午休結束' : 'Break ends in 20 seconds';
  const endTitle = lang === 'zh' ? '午休結束' : 'Break Ended';
  const endBody = lang === 'zh' ? '該上班了！' : 'Time to work!';

  notifications.push({
    id: warningId,
    title: warningTitle,
    body: warningBody,
    schedule: { at: warningTime },
    sound: undefined,
    smallIcon: 'ic_stat_icon_config_sample',
    largeIcon: 'ic_launcher',
    channelId: 'break-timer',
  });

  notifications.push({
    id: endId,
    title: endTitle,
    body: endBody,
    schedule: { at: endTime },
    sound: undefined,
    smallIcon: 'ic_stat_icon_config_sample',
    largeIcon: 'ic_launcher',
    channelId: 'break-timer',
  });

  try {
    await LocalNotifications.schedule({ notifications });
    console.log(`Scheduled break timer: ${durationMinutes} minutes`);
  } catch (error) {
    console.error('Failed to schedule break timer:', error);
  }

  return { warningId, endId };
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
