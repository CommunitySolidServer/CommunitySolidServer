import { getLoggerFor } from '../../../../logging/LogUtil';
import { InternalServerError } from '../../../../util/errors/InternalServerError';
import { NotFoundHttpError } from '../../../../util/errors/NotFoundHttpError';
import type { InteractionRoute } from '../../routing/InteractionRoute';

const logger = getLoggerFor('AccountUtil');

/**
 * Asserts that the ID is defined. Throws a 404 otherwise.
 */
export function assertAccountId(accountId?: string): asserts accountId is string {
  if (!accountId) {
    throw new NotFoundHttpError();
  }
}

/**
 * Parses the given path with the given {@link InteractionRoute}.
 * This assumes this call will succeed and thus expects the path to have the correct format.
 * If not, a 500 error will be thrown.
 *
 * @param route - Route to parse with.
 * @param path - Path to parse.
 */
export function parsePath<T extends InteractionRoute<string>>(route: T, path: string):
NonNullable<ReturnType<T['matchPath']>> {
  const match = route.matchPath(path) as ReturnType<T['matchPath']> | undefined;
  if (!match) {
    logger.error(`Unable to parse path ${path}. This usually implies a server misconfiguration.`);
    throw new InternalServerError(`Unable to parse path ${path}. This usually implies a server misconfiguration.`);
  }
  return match;
}

/**
 * Asserts that the two given IDs are identical.
 * To be used when a request tries to access a resource to ensure they're not accessing someone else's data.
 *
 * @param input - Input ID.
 * @param expected - Expected ID.
 */
export function verifyAccountId(input?: string, expected?: string): asserts expected is string {
  if (input !== expected) {
    throw new NotFoundHttpError();
  }
}
