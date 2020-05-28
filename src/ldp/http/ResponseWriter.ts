import { AsyncHandler } from '../../util/AsyncHandler';
import { HttpResponse } from '../../server/HttpResponse';
import { Operation } from '../operations/Operation';

/**
 * Writes to the HttpResponse.
 * Response depends on the operation result and potentially which errors was thrown.
 */
export type ResponseWriter = AsyncHandler<{ response: HttpResponse; operation: Operation; error?: Error }>;
