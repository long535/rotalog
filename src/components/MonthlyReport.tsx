import React from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { X, Share2, FileText, Clock, DollarSign, Palmtree, Stethoscope, Zap, Calendar } from 'lucide-react';
import { Shift, AppSettings, Job } from '../types';
import { calculateWages, formatCurrency, getShiftPaidHours } from '../utils';
import { useTranslation } from '../i18n';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { haptic } from '../haptics';

interface Props {
  shifts: Shift[];
  settings: AppSettings;
  jobs: Job[];
  month: Date;
  selectedJobId: string | null;
  onClose: () => void;
}

export default function MonthlyReport({ shifts, settings, jobs, month, selectedJobId, onClose }: Props) {
  const t = useTranslation(settings.language);
  const lang = settings.language ?? 'zh';

  const start = startOfMonth(month);
  const end = endOfMonth(month);

  // Filter shifts by month and selected job
  const filtered = shifts.filter(s => {
    const d = new Date(s.startTime);
    const inPeriod = d >= start && d <= end;
    if (!inPeriod) return false;
    if (selectedJobId) return s.jobId === selectedJobId;
    return true;
  });

  const selectedJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;

  const totalHours = filtered.reduce((a, s) => a + getShiftPaidHours(s), 0);
  const totalEarnings = filtered.reduce((a, s) => a + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
  const regularHours = filtered.filter(s => !s.isOvertime && !s.isAnnualLeave).reduce((a, s) => a + getShiftPaidHours(s), 0);
  const overtimeHours = filtered.filter(s => s.isOvertime).reduce((a, s) => a + getShiftPaidHours(s), 0);
  const annualLeaveHours = filtered.filter(s => s.isAnnualLeave).reduce((a, s) => a + getShiftPaidHours(s), 0);
  const sickDays = filtered.filter(s => s.isSickLeave).length;
  const avgPerShift = filtered.length > 0 ? totalHours / filtered.length : 0;
  const avgEarningsPerShift = filtered.length > 0 ? totalEarnings / filtered.length : 0;

  const periodLabel = format(month, lang === 'zh' ? 'yyyy年M月' : 'MMMM yyyy');

  const handleShare = async () => {
    await haptic.medium();
    const text = [
      `📋 ${t.reportTitle} — ${periodLabel}`,
      selectedJob ? `💼 ${selectedJob.name}` : '',
      `⏱ ${t.reportTotalHours}: ${totalHours.toFixed(1)}h`,
      `💰 ${t.reportTotalEarnings}: ${formatCurrency(totalEarnings, settings.currency)}`,
      regularHours > 0 ? `📅 ${t.reportRegularHours}: ${regularHours.toFixed(1)}h` : '',
      overtimeHours > 0 ? `⚡ ${t.reportOvertimeHours}: ${overtimeHours.toFixed(1)}h` : '',
      annualLeaveHours > 0 ? `🌴 ${t.reportAnnualLeave}: ${annualLeaveHours.toFixed(1)}h` : '',
      sickDays > 0 ? `🤒 ${t.reportSickLeave}: ${sickDays} days` : '',
      `📊 ${t.reportShiftCount}: ${filtered.length}`,
      `📈 ${t.reportAvgPerShift}: ${avgPerShift.toFixed(1)}h / ${formatCurrency(avgEarningsPerShift, settings.currency)}`,
    ].filter(Boolean).join('\n');

    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: t.monthlyReport, text });
      } else if (navigator.share) {
        await navigator.share({ title: t.monthlyReport, text });
      } else {
        await navigator.clipboard.writeText(text);
        alert(lang === 'zh' ? '已複製到剪貼板' : 'Copied to clipboard');
      }
    } catch (e) {
      // user cancelled
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[var(--color-primary)]" />
            <h2 className="text-base font-bold text-slate-800 dark:text-gray-100">{t.monthlyReport}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
          {/* Report Card */}
          <div className="m-4 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 text-white shadow-xl">
            {/* Title row */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">{t.reportTitle}</div>
                <div className="text-xl font-bold">{periodLabel}</div>
                {selectedJob && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedJob.color }} />
                    <span className="text-sm text-slate-300">{selectedJob.name}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">{t.reportShiftCount}</div>
                <div className="text-3xl font-black text-[var(--color-primary,#10b981)]">{filtered.length}</div>
              </div>
            </div>

            {/* Main numbers */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
                  <Clock size={12} /> {t.reportTotalHours}
                </div>
                <div className="text-2xl font-black">{totalHours.toFixed(1)}h</div>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-1">
                  <DollarSign size={12} /> {t.reportTotalEarnings}
                </div>
                <div className="text-2xl font-black text-emerald-400">{formatCurrency(totalEarnings, settings.currency)}</div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2">
              {regularHours > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar size={13} /> {t.reportRegularHours}
                  </div>
                  <span className="font-semibold">{regularHours.toFixed(1)}h</span>
                </div>
              )}
              {overtimeHours > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1.5 text-orange-300">
                    <Zap size={13} /> {t.reportOvertimeHours}
                  </div>
                  <span className="font-semibold text-orange-300">{overtimeHours.toFixed(1)}h</span>
                </div>
              )}
              {annualLeaveHours > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1.5 text-purple-300">
                    <Palmtree size={13} /> {t.reportAnnualLeave}
                  </div>
                  <span className="font-semibold text-purple-300">{annualLeaveHours.toFixed(1)}h</span>
                </div>
              )}
              {sickDays > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-1.5 text-red-300">
                    <Stethoscope size={13} /> {t.reportSickLeave}
                  </div>
                  <span className="font-semibold text-red-300">{sickDays} days</span>
                </div>
              )}
              <div className="border-t border-white/20 pt-2 flex justify-between items-center text-sm">
                <span className="text-slate-300">{t.reportAvgPerShift}</span>
                <span className="font-semibold">{avgPerShift.toFixed(1)}h · {formatCurrency(avgEarningsPerShift, settings.currency)}</span>
              </div>
            </div>
          </div>

          {/* Shift-by-job breakdown if all jobs */}
          {!selectedJobId && jobs.length > 0 && (
            <div className="mx-4 mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-slate-100 dark:border-gray-700">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                {lang === 'zh' ? '按工作分類' : 'By Job'}
              </div>
              {jobs.map(job => {
                const jobShifts = filtered.filter(s => s.jobId === job.id);
                if (jobShifts.length === 0) return null;
                const jHours = jobShifts.reduce((a, s) => a + getShiftPaidHours(s), 0);
                const jEarnings = jobShifts.reduce((a, s) => a + calculateWages(getShiftPaidHours(s), s.hourlyWage), 0);
                return (
                  <div key={job.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: job.color }} />
                      <span className="text-sm text-slate-700 dark:text-gray-200">{job.name}</span>
                      <span className="text-xs text-slate-400">({jobShifts.length})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-slate-700 dark:text-gray-200">{jHours.toFixed(1)}h</span>
                      <span className="text-xs text-green-600 ml-2">{formatCurrency(jEarnings, settings.currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 text-sm font-semibold"
          >
            {t.closeReport}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            {t.shareReport}
          </button>
        </div>
      </div>
    </div>
  );
}
