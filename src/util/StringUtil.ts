/**
 * Splits a string by comma.
 *
 * @param input - String instance to split.
 *
 * @returns A String array containining the split parts.
 */
export function splitCommaSeparated(input: string): string[] {
  return input.split(/\s*,\s*/u);
}

/**
 * Sanitizes part of a URL by replacing non-word content with a '-'.
 *
 * @param urlPart - The URL part to sanitize.
 *
 * @returns The sanitized output.
 */
export function sanitizeUrlPart(urlPart: string): string {
  return urlPart.replaceAll(/\W/gu, '-');
}

/**
 * Checks the validity of a file name. A valid name consists of word characters, '-' or '.'.
 *
 * @param name - The name of the file to validate.
 *
 * @returns True if the filename is valid, false otherwise.
 */
export function isValidFileName(name: string): boolean {
  return /^[\w.-]+$/u.test(name);
}

/**
 * Checks whether the given string is a valid URL.
 *
 * @param url - String to check.
 *
 * @returns True if the string is a valid URL.
 */
export function isUrl(url: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts milliseconds to an ISO 8601 duration string.
 * The only categories used are days, hours, minutes, and seconds,
 * because months have no fixed size in milliseconds.
 *
 * @param ms - The duration in ms to convert.
 */
export function msToDuration(ms: number): string {
  let totalSeconds = ms / 1000;
  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  totalSeconds -= days * 60 * 60 * 24;
  const hours = Math.floor(totalSeconds / (60 * 60));
  totalSeconds -= hours * 60 * 60;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - (minutes * 60);

  const stringParts: string[] = [ 'P' ];
  if (days > 0) {
    stringParts.push(`${days}D`);
  }
  if (hours > 0 || minutes > 0 || seconds > 0) {
    stringParts.push('T');
  }
  if (hours > 0) {
    stringParts.push(`${hours}H`);
  }
  if (minutes > 0) {
    stringParts.push(`${minutes}M`);
  }
  if (seconds > 0) {
    stringParts.push(`${seconds}S`);
  }

  return stringParts.join('');
}
