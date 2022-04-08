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
 * @returns The sanitized output.
 */
export function sanitizeUrlPart(urlPart: string): string {
  return urlPart.replace(/\W/gu, '-');
}

/**
 * Checks the validity of a file name. A valid name consists of word characters, '-' or '.'.
 *
 * @param name - The name of the file to validate.
 * @returns True if the filename is valid, false otherwise.
 */
export function isValidFileName(name: string): boolean {
  return /^[\w.-]+$/u.test(name);
}
