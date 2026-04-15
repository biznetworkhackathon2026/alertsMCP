import { subHours, subMinutes, parseISO } from 'date-fns';

export function parseTimeRange(
  startTime?: string,
  endTime?: string,
  defaultWindow: string = '1h'
): { start: Date; end: Date } {
  const now = new Date();
  const end = endTime ? parseRelativeOrAbsolute(endTime, now) : now;
  const start = startTime
    ? parseRelativeOrAbsolute(startTime, now)
    : parseRelativeTime(`-${defaultWindow}`, now);
  return { start, end };
}

function parseRelativeOrAbsolute(timeStr: string, now: Date): Date {
  if (timeStr.startsWith('-')) {
    return parseRelativeTime(timeStr, now);
  }
  return parseISO(timeStr);
}

export function parseRelativeTime(relativeTime: string, now: Date): Date {
  const match = relativeTime.match(/^-(\d+)(m|h|d)$/);
  if (!match) throw new Error(`Invalid relative time: ${relativeTime}`);

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  switch (unit) {
    case 'm': return subMinutes(now, value);
    case 'h': return subHours(now, value);
    case 'd': return subHours(now, value * 24);
    default: throw new Error(`Unknown time unit: ${unit}`);
  }
}
