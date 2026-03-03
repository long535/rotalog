import React, { useState } from 'react';
import { X, Globe, DollarSign, Clock, Palette, Calculator, Calendar, Plus, Trash2, Edit2, Check, Briefcase } from 'lucide-react';
import { AppSettings, Job } from '../types';
import { useTranslation } from '../i18n';
import { haptic } from '../haptics';
import { v4 as uuidv4 } from 'uuid';

const JOB_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
];

const THEME_COLORS = [
  { name: 'Blue', value: '#4a8fd9' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#f43f5e' },
  { name: 'Orange', value: '#f59e0b' },
];

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
  jobs?: Job[];
  onAddJob?: (job: Omit<Job, 'id'>) => void;
  onUpdateJob?: (job: Job) => void;
  onDeleteJob?: (id: string) => void;
  onSetDefaultJob?: (id: string | null) => void;
}

export default function SettingsModal({ settings, onSave, onClose, jobs = [], onAddJob, onUpdateJob, onDeleteJob, onSetDefaultJob }: Props) {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobWage, setJobWage] = useState('50');
  const [jobBreak, setJobBreak] = useState('60');
  const [jobColor, setJobColor] = useState(JOB_COLORS[0].value);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);
  const t = useTranslation(localSettings.language);

  const localJobs = jobs.length > 0 ? jobs : localSettings.jobs;

  const handleChange = (key: keyof AppSettings, value: any) => {
    haptic.selection();
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const handleSave = async () => {
    await haptic.success();
    onSave(localSettings);
    onClose();
  };

  const handleClose = async () => {
    await haptic.light();
    onClose();
  };

  const handleAddJob = () => {
    setEditingJob(null);
    setJobName('');
    setJobWage(localSettings.defaultHourlyWage.toString());
    setJobBreak(localSettings.defaultBreakMinutes.toString());
    setJobColor(JOB_COLORS[0].value);
    setShowJobForm(true);
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setJobName(job.name);
    setJobWage(job.defaultHourlyWage.toString());
    setJobBreak(job.defaultBreakMinutes.toString());
    setJobColor(job.color);
    setShowJobForm(true);
  };

  const handleSaveJob = async () => {
    await haptic.success();
    const jobData = {
      name: jobName,
      defaultHourlyWage: parseFloat(jobWage) || 0,
      defaultBreakMinutes: parseInt(jobBreak) || 0,
      color: jobColor,
    };

    if (editingJob) {
      if (onUpdateJob) {
        onUpdateJob({ ...jobData, id: editingJob.id });
        setLocalSettings(prev => ({
          ...prev,
          jobs: prev.jobs.map(j => j.id === editingJob.id ? { ...jobData, id: editingJob.id } : j),
        }));
      } else {
        const updatedJobs = localSettings.jobs.map(j => j.id === editingJob.id ? { ...jobData, id: editingJob.id } : j);
        setLocalSettings({ ...localSettings, jobs: updatedJobs });
      }
    } else {
      const newJob = { ...jobData, id: uuidv4() };
      if (onAddJob) {
        onAddJob(jobData);
        setLocalSettings(prev => ({
          ...prev,
          jobs: [...prev.jobs, newJob],
        }));
      } else {
        setLocalSettings({ ...localSettings, jobs: [...localSettings.jobs, newJob] });
      }
    }
    setShowJobForm(false);
  };

  const handleDeleteJob = async (id: string) => {
    await haptic.medium();
    if (onDeleteJob) {
      onDeleteJob(id);
      setLocalSettings(prev => ({
        ...prev,
        jobs: prev.jobs.filter(j => j.id !== id),
        defaultJobId: prev.defaultJobId === id ? null : prev.defaultJobId,
      }));
    } else {
      const filtered = localSettings.jobs.filter(j => j.id !== id);
      setLocalSettings({
        ...localSettings,
        jobs: filtered,
        defaultJobId: localSettings.defaultJobId === id ? null : localSettings.defaultJobId,
      });
    }
  };

  const handleSetDefaultJob = async (id: string | null) => {
    await haptic.selection();
    if (onSetDefaultJob) {
      onSetDefaultJob(id);
      setLocalSettings(prev => ({
        ...prev,
        defaultJobId: id,
      }));
    } else {
      setLocalSettings({ ...localSettings, defaultJobId: id });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={handleClose}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Bottom Sheet Handle */}
        <div className="flex h-6 w-full items-center justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200"></div>
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-4 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800">{t.settingsTitle}</h2>
          <button onClick={handleClose} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
          {/* Profile Section */}
          <section className="pb-6 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Profile</h3>
            
            {/* Language */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--color-primary)]">language</span>
                </div>
                <span className="font-medium text-slate-700">{t.language}</span>
              </div>
              <select
                value={localSettings.language || 'zh'}
                onChange={(e) => handleChange('language', e.target.value)}
                className="px-3 py-2 bg-slate-50 rounded-xl text-sm font-medium text-slate-600 outline-none"
              >
                <option value="zh">繁體中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </section>

          {/* Defaults Section */}
          <section className="pb-6 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Defaults</h3>
            
            {/* Default Wage */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-500">payments</span>
                </div>
                <span className="font-medium text-slate-700">{t.defaultWage}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">{localSettings.currency}</span>
                <input
                  type="number"
                  value={localSettings.defaultHourlyWage}
                  onChange={(e) => handleChange('defaultHourlyWage', parseFloat(e.target.value) || 0)}
                  className="w-20 p-2 bg-slate-50 rounded-xl text-right font-medium text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* Currency */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-yellow-600">attach_money</span>
                </div>
                <span className="font-medium text-slate-700">{t.currency}</span>
              </div>
              <input
                type="text"
                value={localSettings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-20 p-2 bg-slate-50 rounded-xl text-center font-medium text-slate-700 outline-none"
              />
            </div>

            {/* Default Break */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-500">coffee</span>
                </div>
                <span className="font-medium text-slate-700">{t.defaultBreak}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={localSettings.defaultBreakMinutes}
                  onChange={(e) => handleChange('defaultBreakMinutes', parseInt(e.target.value) || 0)}
                  className="w-20 p-2 bg-slate-50 rounded-xl text-right font-medium text-slate-700 outline-none"
                />
                <span className="text-slate-400 text-sm">min</span>
              </div>
            </div>

            {/* Week Starts On */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cyan-500">calendar_today</span>
                </div>
                <span className="font-medium text-slate-700">{t.weekStartsOn}</span>
              </div>
              <select
                value={localSettings.weekStartsOn ?? 1}
                onChange={(e) => handleChange('weekStartsOn', parseInt(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
                className="px-3 py-2 bg-slate-50 rounded-xl text-sm font-medium text-slate-600 outline-none"
              >
                {t.weekStartsOnOptions.map((label, index) => (
                  <option key={index} value={index}>{label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Appearance Section */}
          <section className="pb-6 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Appearance</h3>
            
            {/* Theme */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--color-primary)]">palette</span>
                </div>
                <span className="font-medium text-slate-700">{t.theme}</span>
              </div>
              <select
                value={localSettings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className="px-3 py-2 bg-slate-50 rounded-xl text-sm font-medium text-slate-600 outline-none"
              >
                <option value="light">{t.themeLight}</option>
                <option value="dark">{t.themeDark}</option>
                <option value="color01">{t.themeColor01}</option>
                <option value="color02">{t.themeColor02}</option>
              </select>
            </div>
          </section>

          {/* Taxes Section */}
          <section className="pb-6 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Taxes</h3>
            
            {/* UK Tax */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--color-primary)]">calculate</span>
                </div>
                <div>
                  <div className="font-medium text-slate-700">{t.ukTax}</div>
                  <div className="text-xs text-slate-400">{t.ukTaxDesc}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={localSettings.enableUKTaxes || false} onChange={(e) => handleChange('enableUKTaxes', e.target.checked)} />
                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>
          </section>

          {/* Jobs Section */}
          <section className="pb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Jobs</h3>
              <button
                onClick={handleAddJob}
                className="p-2 bg-[var(--color-primary)] text-white rounded-xl hover:shadow-lg transition-all"
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>

            {showJobForm && (
              <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder={t.jobNamePlaceholder}
                  className="w-full p-3 mb-3 bg-white rounded-xl text-slate-800 outline-none"
                />
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <input
                    type="number"
                    value={jobWage}
                    onChange={(e) => setJobWage(e.target.value)}
                    placeholder={t.jobWage}
                    className="p-3 bg-white rounded-xl text-slate-800 outline-none"
                  />
                  <input
                    type="number"
                    value={jobBreak}
                    onChange={(e) => setJobBreak(e.target.value)}
                    placeholder={t.jobBreak}
                    className="p-3 bg-white rounded-xl text-slate-800 outline-none"
                  />
                </div>
                <div className="flex gap-2 mb-3">
                  {JOB_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setJobColor(c.value)}
                      className={`w-8 h-8 rounded-full transition-all ${jobColor === c.value ? 'ring-2 ring-offset-2 ring-[var(--color-primary)]' : ''}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveJob}
                    className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">check</span>
                    {editingJob ? t.editJob : t.addJob}
                  </button>
                  <button
                    onClick={() => setShowJobForm(false)}
                    className="px-4 py-3 bg-slate-200 text-slate-600 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {localJobs.length === 0 && !showJobForm ? (
              <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl">
                {t.noJobsYet}
              </div>
            ) : (
              <div className="space-y-2">
                {localJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: job.color }} />
                      <span className="text-sm font-medium text-slate-700">{job.name}</span>
                      {localSettings.defaultJobId === job.id && (
                        <span className="text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {localSettings.defaultJobId !== job.id && (
                        <button
                          onClick={() => handleSetDefaultJob(job.id)}
                          className="p-2 text-slate-400 hover:text-[var(--color-primary)] transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleEditJob(job)}
                        className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Export Section */}
          <section className="pb-6">
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--color-primary)]">sim_card_download</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-800 mb-1">Export Activity Log</h4>
                  <p className="text-xs text-slate-500 mb-3">Download a complete CSV archive of all your entries.</p>
                  <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                    Export as CSV
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={handleSave}
            className="w-full py-4 px-6 rounded-[24px] bg-[var(--color-action)] text-emerald-900 font-bold shadow-lg shadow-emerald-100 hover:brightness-105 transition-all"
          >
            {t.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
}
