import { differenceInMinutes, parseISO } from 'date-fns';
import { Shift } from './types';

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
