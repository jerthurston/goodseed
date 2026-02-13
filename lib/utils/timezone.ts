/**
 * Timezone utilities for displaying times in Canada timezone
 * 
 * Default: America/Vancouver (Pacific Time - PT)
 * Can be changed to America/Edmonton (Mountain) or America/Toronto (Eastern)
 */

// Default timezone for the application
export const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Vancouver';

/**
 * Available Canada timezones
 */
export const CANADA_TIMEZONES = {
  PACIFIC: 'America/Vancouver',      // UTC-8 (PST) or UTC-7 (PDT)
  MOUNTAIN: 'America/Edmonton',      // UTC-7 (MST) or UTC-6 (MDT)
  CENTRAL: 'America/Winnipeg',       // UTC-6 (CST) or UTC-5 (CDT)
  EASTERN: 'America/Toronto',        // UTC-5 (EST) or UTC-4 (EDT)
  ATLANTIC: 'America/Halifax',       // UTC-4 (AST) or UTC-3 (ADT)
} as const;

/**
 * Format a Date object or timestamp to Canada timezone string
 * 
 * @param date - Date object, ISO string, or Unix timestamp
 * @param timezone - Canada timezone (default: Pacific)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in Canada timezone
 * 
 * @example
 * formatToCanadaTime(new Date())
 * // "2/12/2026, 5:53:00 PM PST"
 * 
 * formatToCanadaTime(1770957300000, 'America/Vancouver')
 * // "2/12/2026, 8:35:00 PM PST"
 */
export function formatToCanadaTime(
  date: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short',
    ...options,
  };

  return dateObj.toLocaleString('en-US', defaultOptions);
}

/**
 * Format timestamp to Canada timezone with short format
 * 
 * @example
 * formatToCanadaTimeShort(new Date())
 * // "Feb 12, 5:53 PM"
 */
export function formatToCanadaTimeShort(
  date: Date | string | number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatToCanadaTime(date, timezone, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: undefined,
  });
}

/**
 * Get current time in Canada timezone
 * 
 * @example
 * getCurrentCanadaTime()
 * // "2/12/2026, 5:53:00 PM PST"
 */
export function getCurrentCanadaTime(timezone: string = DEFAULT_TIMEZONE): string {
  return formatToCanadaTime(new Date(), timezone);
}

/**
 * Convert Unix timestamp to Canada timezone
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @param timezone - Canada timezone
 * @returns Formatted date string
 * 
 * @example
 * convertTimestampToCanada(1770957300000)
 * // "2/12/2026, 8:35:00 PM PST"
 */
export function convertTimestampToCanada(
  timestamp: number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatToCanadaTime(timestamp, timezone);
}

/**
 * Get timezone offset for Canada timezone
 * 
 * @example
 * getTimezoneOffset('America/Vancouver')
 * // "-08:00" (PST) or "-07:00" (PDT)
 */
export function getTimezoneOffset(timezone: string = DEFAULT_TIMEZONE): string {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  const offset = (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offset));
  const minutes = Math.round((Math.abs(offset) % 1) * 60);
  
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Get timezone abbreviation (PST, PDT, MST, etc.)
 * 
 * @example
 * getTimezoneAbbr('America/Vancouver')
 * // "PST" or "PDT"
 */
export function getTimezoneAbbr(timezone: string = DEFAULT_TIMEZONE): string {
  const date = new Date();
  const formatted = date.toLocaleString('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  });
  
  // Extract timezone abbreviation from formatted string
  const match = formatted.match(/\b[A-Z]{3,4}\b/);
  return match ? match[0] : '';
}

/**
 * Convert UTC cron pattern to Canada timezone equivalent
 * NOTE: Cron patterns in Bull Queue always use UTC
 * This is for display purposes only
 * 
 * @param utcHour - Hour in UTC (0-23)
 * @param utcMinute - Minute in UTC (0-59)
 * @param timezone - Canada timezone
 * @returns Object with local hour, minute, and formatted string
 * 
 * @example
 * convertCronToCanada(4, 35, 'America/Vancouver')
 * // { hour: 20, minute: 35, formatted: "8:35 PM PST" }
 */
export function convertCronToCanada(
  utcHour: number,
  utcMinute: number,
  timezone: string = DEFAULT_TIMEZONE
): { hour: number; minute: number; formatted: string; isPreviousDay: boolean } {
  // Create a date with the UTC time
  const utcDate = new Date();
  utcDate.setUTCHours(utcHour, utcMinute, 0, 0);
  
  // Format to Canada timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
  
  const parts = formatter.formatToParts(utcDate);
  const hourPart = parts.find(p => p.type === 'hour')?.value || '0';
  const minutePart = parts.find(p => p.type === 'minute')?.value || '0';
  const dayPeriodPart = parts.find(p => p.type === 'dayPeriod')?.value || 'AM';
  
  let hour = parseInt(hourPart);
  const minute = parseInt(minutePart);
  
  // Convert to 24-hour format for comparison
  if (dayPeriodPart === 'PM' && hour !== 12) {
    hour += 12;
  } else if (dayPeriodPart === 'AM' && hour === 12) {
    hour = 0;
  }
  
  const formatted = `${hourPart}:${minutePart.padStart(2, '0')} ${dayPeriodPart} ${getTimezoneAbbr(timezone)}`;
  
  // Check if it's previous day (timezone is behind UTC)
  const tzOffset = getTimezoneOffset(timezone);
  const isPreviousDay = tzOffset.startsWith('-');
  
  return {
    hour,
    minute,
    formatted,
    isPreviousDay,
  };
}

/**
 * Format duration in milliseconds to human-readable string
 * 
 * @example
 * formatDuration(3600000)
 * // "1 hour"
 * 
 * formatDuration(7200000)
 * // "2 hours"
 * 
 * formatDuration(3660000)
 * // "1 hour 1 minute"
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 
      ? `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`
      : `${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`
      : `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return `${seconds} second${seconds !== 1 ? 's' : ''}`;
}

/**
 * Get relative time (e.g., "2 hours ago", "in 3 hours")
 * 
 * @example
 * getRelativeTime(Date.now() - 3600000)
 * // "1 hour ago"
 * 
 * getRelativeTime(Date.now() + 3600000)
 * // "in 1 hour"
 */
export function getRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const now = new Date();
  const diff = dateObj.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  const suffix = diff > 0 ? 'in' : 'ago';
  const prefix = diff > 0 ? 'in ' : '';
  const postfix = diff > 0 ? '' : ' ago';
  
  if (days > 0) {
    return `${prefix}${days} day${days > 1 ? 's' : ''}${postfix}`;
  }
  if (hours > 0) {
    return `${prefix}${hours} hour${hours > 1 ? 's' : ''}${postfix}`;
  }
  if (minutes > 0) {
    return `${prefix}${minutes} minute${minutes > 1 ? 's' : ''}${postfix}`;
  }
  return `${prefix}${seconds} second${seconds !== 1 ? 's' : ''}${postfix}`;
}
