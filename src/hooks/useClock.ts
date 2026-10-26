// ===================================================
// DeepSync HUD — useClock Hook
// リアルタイム・サイバーパンクHUD時計
// ===================================================

import { useState, useEffect } from 'react';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface ClockData {
  timeStr: string;      // 17:38:45
  dateStr: string;      // 2026.10.26
  dayStr: string;       // MON
  fullDisplay: string;  // 2026.10.26 MON 17:38:45
  hours: string;        // 17
  minutes: string;      // 38
  seconds: string;      // 45
}

export function useClock(): ClockData {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, '0');

  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const date = pad(now.getDate());
  const day = WEEKDAYS[now.getDay()];

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  const timeStr = `${hours}:${minutes}:${seconds}`;
  const dateStr = `${year}.${month}.${date}`;
  const fullDisplay = `${dateStr} ${day} ${timeStr}`;

  return {
    timeStr,
    dateStr,
    dayStr: day,
    fullDisplay,
    hours,
    minutes,
    seconds,
  };
}
