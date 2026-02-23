import React from 'react';
import { X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.settingsTitle}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.language}</label>
            <select
              value={localSettings.language || 'zh'}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="zh">繁體中文</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.defaultWage}</label>
            <input
              type="number"
              value={localSettings.defaultHourlyWage}
              onChange={(e) => handleChange('defaultHourlyWage', parseFloat(e.target.value) || 0)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.currency}</label>
            <input
              type="text"
              value={localSettings.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.defaultBreak}</label>
            <input
              type="number"
              value={localSettings.defaultBreakMinutes}
              onChange={(e) => handleChange('defaultBreakMinutes', parseInt(e.target.value) || 0)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.theme}</label>
            <select
              value={localSettings.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            >
              <option value="light">{t.themeLight}</option>
              <option value="dark">{t.themeDark}</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg mt-4">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">{t.ukTax}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t.ukTaxDesc}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={localSettings.enableUKTaxes || false} onChange={(e) => handleChange('enableUKTaxes', e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            {t.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
}
