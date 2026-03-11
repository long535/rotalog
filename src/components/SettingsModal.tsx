import React, { useState } from 'react';
import { AppSettings, Job } from '../types';
import { useTranslation } from '../i18n';
import { haptic } from '../haptics';
import { v4 as uuidv4 } from 'uuid';
import { X, Globe, Wallet, DollarSign, Coffee, CalendarDays, Palette, Calculator, Plus, Check, Pencil, Trash2, Download, Upload, ChevronRight, Calculator as CalcIcon, Share2 } from 'lucide-react';

const JOB_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
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
  onExport?: () => void;
  onSaveToDevice?: () => void;
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SettingsModal({ settings, onSave, onClose, jobs = [], onAddJob, onUpdateJob, onDeleteJob, onSetDefaultJob, onExport, onSaveToDevice, onImport }: Props) {
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
      }
    } else {
      const newJob = { ...jobData, id: uuidv4() };
      if (onAddJob) {
        onAddJob(jobData);
        setLocalSettings(prev => ({
          ...prev,
          jobs: [...prev.jobs, newJob],
        }));
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex h-6 w-full items-center justify-center sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200"></div>
        </div>
        
        <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-slate-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100">{t.settingsTitle}</h2>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 custom-scrollbar">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Profile</h3>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Globe size={18} className="text-[var(--color-primary)]" />
                </div>
                <span className="font-medium text-slate-700 dark:text-gray-200 text-sm">{t.language}</span>
              </div>
              <select
                value={localSettings.language || 'zh'}
                onChange={(e) => handleChange('language', e.target.value)}
                className="flex-1 max-w-[120px] px-2 py-1.5 bg-slate-50 dark:bg-gray-700 rounded-lg text-sm font-medium text-slate-600 dark:text-gray-300 outline-none"
              >
                <option value="zh">繁體中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Defaults</h3>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Wallet size={18} className="text-green-500" />
                </div>
                <span className="font-medium text-slate-700 dark:text-gray-200 text-sm">{t.defaultWage}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-sm">{localSettings.currency}</span>
                <input
                  type="number"
                  value={localSettings.defaultHourlyWage}
                  onChange={(e) => handleChange('defaultHourlyWage', parseFloat(e.target.value) || 0)}
                  className="w-16 p-1.5 bg-slate-50 dark:bg-gray-700 rounded-lg text-right font-medium text-slate-700 dark:text-gray-200 outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <DollarSign size={18} className="text-yellow-600" />
                </div>
                <span className="font-medium text-slate-700 dark:text-gray-200 text-sm">{t.currency}</span>
              </div>
              <input
                type="text"
                value={localSettings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="flex-1 max-w-[80px] p-1.5 bg-slate-50 rounded-lg text-center font-medium text-slate-700 outline-none text-sm"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Coffee size={18} className="text-purple-500" />
                </div>
                <span className="font-medium text-slate-700 text-sm">{t.defaultBreak}</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={localSettings.defaultBreakMinutes}
                  onChange={(e) => handleChange('defaultBreakMinutes', parseInt(e.target.value) || 0)}
                  className="w-16 p-1.5 bg-slate-50 dark:bg-gray-700 rounded-lg text-right font-medium text-slate-700 dark:text-gray-200 outline-none text-sm"
                />
                <span className="text-slate-400 text-xs">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <CalendarDays size={18} className="text-cyan-500" />
                </div>
                <span className="font-medium text-slate-700 text-sm">{t.weekStartsOn}</span>
              </div>
              <select
                value={localSettings.weekStartsOn ?? 1}
                onChange={(e) => handleChange('weekStartsOn', parseInt(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
                className="flex-1 max-w-[120px] px-2 py-1.5 bg-slate-50 dark:bg-gray-700 rounded-lg text-sm font-medium text-slate-600 dark:text-gray-300 outline-none"
              >
                {t.weekStartsOnOptions.map((label, index) => (
                  <option key={index} value={index}>{label}</option>
                ))}
              </select>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Appearance</h3>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Palette size={18} className="text-[var(--color-primary)]" />
                </div>
                <span className="font-medium text-slate-700 text-sm">{t.theme}</span>
              </div>
              <select
                value={localSettings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
                className="flex-1 max-w-[120px] px-2 py-1.5 bg-slate-50 rounded-lg text-sm font-medium text-slate-600 outline-none"
              >
                <option value="light">{t.themeLight}</option>
                <option value="dark">{t.themeDark}</option>
                <option value="color02">{t.themeColor02}</option>
              </select>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Taxes</h3>
            
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <CalcIcon size={18} className="text-[var(--color-primary)]" />
                </div>
                <div>
                  <div className="font-medium text-slate-700 text-sm">{t.ukTax}</div>
                  <div className="text-xs text-slate-400">{t.ukTaxDesc}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={localSettings.enableUKTaxes || false} onChange={(e) => handleChange('enableUKTaxes', e.target.checked)} />
                <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Jobs</h3>
              <button
                onClick={handleAddJob}
                className="p-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:shadow-lg transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            {showJobForm && (
              <div className="mb-3 p-3 bg-slate-50 dark:bg-gray-700 rounded-xl border border-slate-100 dark:border-gray-600">
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder={t.jobNamePlaceholder}
                  className="w-full p-2 mb-2 bg-white dark:bg-gray-600 rounded-lg text-slate-800 dark:text-gray-100 outline-none text-sm"
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="number"
                    value={jobWage}
                    onChange={(e) => setJobWage(e.target.value)}
                    placeholder={t.jobWage}
                    className="p-2 bg-white rounded-lg text-slate-800 outline-none text-sm"
                  />
                  <input
                    type="number"
                    value={jobBreak}
                    onChange={(e) => setJobBreak(e.target.value)}
                    placeholder={t.jobBreak}
                    className="p-2 bg-white rounded-lg text-slate-800 outline-none text-sm"
                  />
                </div>
                <div className="flex gap-1.5 mb-2">
                  {JOB_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setJobColor(c.value)}
                      className={`w-7 h-7 rounded-full transition-all ${jobColor === c.value ? 'ring-2 ring-offset-2 ring-[var(--color-primary)]' : ''}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveJob}
                    className="flex-1 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium flex items-center justify-center gap-1 text-sm"
                  >
                    <Check size={18} />
                    {editingJob ? t.editJob : t.addJob}
                  </button>
                  <button
                    onClick={() => setShowJobForm(false)}
                    className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg font-medium text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {localJobs.length === 0 && !showJobForm ? (
              <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-xl">
                {t.noJobsYet}
              </div>
            ) : (
              <div className="space-y-2">
                {localJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: job.color }} />
                      <span className="text-xs font-medium text-slate-700 truncate">{job.name}</span>
                      {localSettings.defaultJobId === job.id && (
                        <span className="text-[10px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 rounded-full flex-shrink-0">Default</span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {localSettings.defaultJobId !== job.id && (
                        <button
                          onClick={() => handleSetDefaultJob(job.id)}
                          className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] transition-colors"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditJob(job)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Data</h3>
            
            <div className="space-y-2">
              <button 
                onClick={onSaveToDevice}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                  <Download size={18} className="text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-medium text-slate-800 text-xs truncate">Save to Device</h4>
                  <p className="text-xs text-slate-500 truncate">Save CSV to app storage</p>
                </div>
                <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
              </button>

              <button 
                onClick={onExport}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                  <Share2 size={18} className="text-blue-500" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-medium text-slate-800 text-xs truncate">Share</h4>
                  <p className="text-xs text-slate-500 truncate">Share CSV via other apps</p>
                </div>
                <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
              </button>
              
              <label className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer">
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={onImport}
                />
                <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center flex-shrink-0">
                  <Upload size={18} className="text-green-500" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h4 className="font-medium text-slate-800 text-xs truncate">Import Data</h4>
                  <p className="text-xs text-slate-500 truncate">Import shifts from CSV</p>
                </div>
                <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />
              </label>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={handleSave}
            className="w-full py-3 px-5 rounded-2xl bg-[var(--color-action)] text-emerald-900 font-bold shadow-lg shadow-emerald-100 hover:brightness-105 transition-all text-sm"
          >
            {t.saveSettings}
          </button>
          <div className="text-center mt-3 text-xs text-slate-400">Version 1.5.4 (100342)</div>
        </div>
      </div>
    </div>
  );
}
