import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { parseISO } from 'date-fns';
import { Shift, AppSettings } from '../types';
import { useTranslation } from '../i18n';
import { DollarSign } from 'lucide-react';

const BREAK_EXCLUDE_KEY = 'live_earning_exclude_break';

interface Props {
  shifts: Shift[];
  settings: AppSettings;
}

/** Single odometer digit with vertical slide animation inside a slot-machine cell */
function OdometerDigit({ digit }: { digit: string }) {
  if (digit === '.' || digit === ',') {
    return <span className="odometer-separator">{digit}</span>;
  }

  const num = parseInt(digit, 10);
  if (isNaN(num)) {
    return <span className="odometer-separator">{digit}</span>;
  }

  return (
    <span className="odometer-digit">
      <span
        className="odometer-strip"
        style={{ transform: `translateY(-${num * 10}%)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <span key={n} className="odometer-num">{n}</span>
        ))}
      </span>
    </span>
  );
}

/** Format a number to exactly 4 decimal places and return each character */
function formatEarning(amount: number): string[] {
  const formatted = amount.toFixed(4);
  return formatted.split('');
}

export default function LiveEarningBanner({ shifts, settings }: Props) {
  const t = useTranslation(settings.language);
  const [now, setNow] = useState(() => Date.now());
  const [excludeBreak, setExcludeBreak] = useState(() => {
    try {
      return localStorage.getItem(BREAK_EXCLUDE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Find the currently active shift
  const activeShift = useMemo(() => {
    const current = new Date(now);
    return shifts.find(s => {
      if (s.isAnnualLeave || s.isSickLeave) return false;
      const start = parseISO(s.startTime);
      const end = parseISO(s.endTime);
      return current >= start && current < end;
    }) || null;
  }, [shifts, now]);

  // 100ms interval for smooth counter
  useEffect(() => {
    if (!activeShift) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, [activeShift?.id]);

  // Persist break toggle
  const toggleBreak = useCallback(() => {
    setExcludeBreak(prev => {
      const next = !prev;
      try {
        localStorage.setItem(BREAK_EXCLUDE_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Calculate current earnings
  const earning = useMemo(() => {
    if (!activeShift) return 0;

    const start = parseISO(activeShift.startTime).getTime();
    const elapsedMs = Math.max(0, now - start);
    const elapsedSeconds = elapsedMs / 1000;

    const wagePerSecond = activeShift.hourlyWage / 3600;

    if (excludeBreak && activeShift.breakMinutes > 0) {
      const breakSeconds = activeShift.breakMinutes * 60;
      const effectiveSeconds = Math.max(0, elapsedSeconds - breakSeconds);
      return effectiveSeconds * wagePerSecond;
    }

    return elapsedSeconds * wagePerSecond;
  }, [activeShift, now, excludeBreak]);

  // Don't render if no active shift
  if (!activeShift) return null;

  const digits = formatEarning(earning);
  const currencySymbol = getCurrencySymbol(settings.currency);

  return (
    <div className="live-earning-banner animate-slide-up">
      {/* Top row: label left, toggle right */}
      <div className="live-earning-header">
        <div className="live-earning-left">
          <div className="live-earning-icon">
            <DollarSign size={14} />
          </div>
          <span className="live-earning-label">{t.liveEarning || 'Earning Now'}</span>
          <span className="live-earning-pulse" />
        </div>

        <button onClick={toggleBreak} className="live-earning-toggle">
          <span className="live-earning-toggle-label">
            {t.excludeBreak || 'Exclude Break'}
          </span>
          <span className={`live-earning-toggle-track ${excludeBreak ? 'active' : ''}`}>
            <span className="live-earning-toggle-thumb" />
          </span>
        </button>
      </div>

      {/* Center: large neon odometer */}
      <div className="live-earning-center">
        <span className="live-earning-currency-neon">{currencySymbol}</span>
        <span className="odometer-neon">
          {digits.map((char, i) => (
            <span key={i}>
              <OdometerDigit digit={char} />
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

function getCurrencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency }).formatToParts(0);
    const sym = parts.find(p => p.type === 'currency');
    return sym?.value || currency;
  } catch {
    return currency;
  }
}
