export const LOG_LEVELS = [ 'error', 'warn', 'info', 'verbose', 'debug', 'silly' ] as const;

/**
 * Different log levels, from most important to least important.
 */
export type LogLevel = typeof LOG_LEVELS[number];
