/**
 * Rate Limiting Configuration
 */
export const CONFIG = {
  MAX_ATTEMPTS: 3,              // Max attempts trong window
  WINDOW_MINUTES: 15,           // Time window (minutes)
  COOLDOWN_MINUTES: 30,         // Cooldown duration khi vi phạm
  DAILY_MAX_ATTEMPTS: 10,       // Optional: Max per day
  CLEANUP_DAYS: 7,              // Cleanup records sau 7 ngày
};