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
      } else {
        const updatedJobs = localSettings.jobs.map(j => j.id === editingJob.id ? { ...jobData, id: editingJob.id } : j);
        setLocalSettings({ ...localSettings, jobs: updatedJobs });
      }
    } else {
      const newJob = { ...jobData, id: uuidv4() };
      if (onAddJob) {
        onAddJob(jobData);
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
    } else {
      setLocalSettings({ ...localSettings, defaultJobId: id });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800/95 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">{t.settingsTitle}</h2>
          <button onClick={handleClose} className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Language Setting */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Globe size={18} className="text-white" />
              </div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.language}</label>
            </div>
            <select
              value={localSettings.language || 'zh'}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-medium"
            >
              <option value="zh">繁體中文</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Default Wage Setting */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <DollarSign size={18} className="text-white" />
              </div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.defaultWage}</label>
            </div>
            <input
              type="number"
              value={localSettings.defaultHourlyWage}
              onChange={(e) => handleChange('defaultHourlyWage', parseFloat(e.target.value) || 0)}
              className="w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-medium"
            />
          </div>
          
          {/* Currency Setting */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">¥</span>
              </div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.currency}</label>
            </div>
            <input
              type="text"
              value={localSettings.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-medium"
            />
          </div>

          {/* Default Break Setting */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Clock size={18} className="text-white" />
              </div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.defaultBreak}</label>
            </div>
            <input
              type="number"
              value={localSettings.defaultBreakMinutes}
              onChange={(e) => handleChange('defaultBreakMinutes', parseInt(e.target.value) || 0)}
              className="w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-medium"
            />
          </div>

          {/* Week Starts On Setting */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Calendar size={18} className="text-white" />
              </div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.weekStartsOn}</label>
            </div>
            <select
              value={localSettings.weekStartsOn ?? 1}
              onChange={(e) => handleChange('weekStartsOn', parseInt(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
              className="w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-medium"
            >
              {t.weekStartsOnOptions.map((label, index) => (
                <option key={index} value={index}>{label}</option>
              ))}
            </select>
          </div>

          {/* Theme Setting */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Palette size={18} className="text-white" />
              </div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.theme}</label>
            </div>
            <select
              value={localSettings.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              className="w-full p-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl input-modern focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white font-medium"
            >
              <option value="light">{t.themeLight}</option>
              <option value="dark">{t.themeDark}</option>
            </select>
          </div>

          {/* UK Tax Setting */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-4 border border-indigo-100/50 dark:border-indigo-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                  <Calculator size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-semibold text-indigo-900 dark:text-indigo-100">{t.ukTax}</div>
                  <div className="text-xs text-indigo-600 dark:text-indigo-300 mt-0.5">{t.ukTaxDesc}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={localSettings.enableUKTaxes || false} onChange={(e) => handleChange('enableUKTaxes', e.target.checked)} />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500"></div>
              </label>
            </div>
          </div>

          {/* Jobs Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Briefcase size={18} className="text-white" />
                </div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t.jobs}</label>
              </div>
              <button
                onClick={handleAddJob}
                className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all"
              >
                <Plus size={18} />
              </button>
            </div>

            {showJobForm && (
              <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder={t.jobNamePlaceholder}
                  className="w-full p-3 mb-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="number"
                    value={jobWage}
                    onChange={(e) => setJobWage(e.target.value)}
                    placeholder={t.jobWage}
                    className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                  />
                  <input
                    type="number"
                    value={jobBreak}
                    onChange={(e) => setJobBreak(e.target.value)}
                    placeholder={t.jobBreak}
                    className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2 mb-2">
                  {JOB_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setJobColor(c.value)}
                      className={`w-8 h-8 rounded-full transition-all ${jobColor === c.value ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveJob}
                    className="flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium"
                  >
                    <Check size={16} className="inline mr-1" />
                    {editingJob ? t.editJob : t.addJob}
                  </button>
                  <button
                    onClick={() => setShowJobForm(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium"
                  >
                    {t.delete}
                  </button>
                </div>
              </div>
            )}

            {localJobs.length === 0 && !showJobForm ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                {t.noJobsYet}
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {localJobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: job.color }} />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{job.name}</span>
                      {localSettings.defaultJobId === job.id && (
                        <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded">{t.defaultJob}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {(onSetDefaultJob || true) && localSettings.defaultJobId !== job.id && (
                        <button
                          onClick={() => handleSetDefaultJob(job.id)}
                          className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
                          title={t.setAsDefault}
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditJob(job)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
          <button
            onClick={handleSave}
            className="w-full py-4 gradient-primary text-white rounded-2xl font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all active:scale-[0.98]"
          >
            {t.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
}
