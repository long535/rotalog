import React from 'react';
import { Target } from 'lucide-react';
import { AppSettings } from '../types';
import { formatCurrency } from '../utils';
import { useTranslation } from '../i18n';

interface Props {
  settings: AppSettings;
  currentHours: number;
  currentEarnings: number;
}

export default function GoalTracker({ settings, currentHours, currentEarnings }: Props) {
  const t = useTranslation(settings.language);
  const goal = settings.monthlyGoal;

  const hasHoursGoal = goal?.hours && goal.hours > 0;
  const hasEarningsGoal = goal?.earnings && goal.earnings > 0;

  if (!hasHoursGoal && !hasEarningsGoal) return null;

  const hoursPct = hasHoursGoal ? Math.min(100, (currentHours / goal!.hours!) * 100) : 0;
  const earningsPct = hasEarningsGoal ? Math.min(100, (currentEarnings / goal!.earnings!) * 100) : 0;

  const hoursHit = hasHoursGoal && currentHours >= goal!.hours!;
  const earningsHit = hasEarningsGoal && currentEarnings >= goal!.earnings!;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} className="text-[var(--color-primary)]" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-gray-200">{t.goalProgress}</h3>
      </div>

      <div className="space-y-4">
        {/* Hours Goal */}
        {hasHoursGoal && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-500 dark:text-gray-400">
                ⏱ {t.hoursGoal}
              </span>
              <div className="flex items-center gap-1.5">
                {hoursHit && <span className="text-xs font-bold text-emerald-500">{t.goalHit}</span>}
                <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">
                  {currentHours.toFixed(1)}h / {goal!.hours}h
                </span>
              </div>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${hoursPct}%`,
                  background: hoursHit
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light, #60a5fa))',
                }}
              />
            </div>
            <div className="text-right text-xs text-slate-400 mt-0.5">{hoursPct.toFixed(0)}%</div>
          </div>
        )}

        {/* Earnings Goal */}
        {hasEarningsGoal && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-500 dark:text-gray-400">
                💰 {t.earningsGoal}
              </span>
              <div className="flex items-center gap-1.5">
                {earningsHit && <span className="text-xs font-bold text-emerald-500">{t.goalHit}</span>}
                <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">
                  {formatCurrency(currentEarnings, settings.currency)} / {formatCurrency(goal!.earnings!, settings.currency)}
                </span>
              </div>
            </div>
            <div className="h-3 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${earningsPct}%`,
                  background: earningsHit
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                }}
              />
            </div>
            <div className="text-right text-xs text-slate-400 mt-0.5">{earningsPct.toFixed(0)}%</div>
          </div>
        )}
      </div>
    </div>
  );
}
