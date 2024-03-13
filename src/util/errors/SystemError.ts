/**
 * Interface for Node.js System errors
 *
 * Node.js generates system errors when exceptions occur within its runtime environment.
 * These usually occur when an application violates an operating system constraint.
 * For example, a system error will occur if an application attempts to read a file that does not exist.
 */
export interface SystemError extends Error {
  /**
   * If present, the address to which a network connection failed.
   */
  address?: string;
  /**
   * The string error code.
   * Full list: https://man7.org/linux/man-pages/man3/errno.3.html
   */
  code: string;
  /**
   * If present, the file path destination when reporting a file system error.
   */
  dest?: string;
  /**
   * The system-provided error number.
   */
  errno: number | string;
  /**
   * If present, extra details about the error condition.
   */
  info?: unknown;
  /**
   * If present, the file path when reporting a file system error.
   */
  path?: string;
  /**
   * If present, the network connection port that is not available.
   */
  port?: string;
  /**
   * The name of the system call that triggered the error.
   */
  syscall: string;
}

export function isSystemError(error: unknown): error is SystemError {
  return Boolean((error as SystemError).code && (error as SystemError).syscall);
}
