import React from 'react';
import { X, Globe, DollarSign, Clock, Palette, Calculator } from 'lucide-react';
import { AppSettings } from '../types';
import { useTranslation } from '../i18n';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: Props) {
  const [localSettings, setLocalSettings] = React.useState<AppSettings>(settings);
  const t = useTranslation(localSettings.language);

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings({ ...localSettings, [key]: value });
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800/95 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">{t.settingsTitle}</h2>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
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
