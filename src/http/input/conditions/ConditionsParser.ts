import { AsyncHandler } from 'asynchronous-handlers';
import type { HttpRequest } from '../../../server/HttpRequest';
import type { Conditions } from '../../../storage/conditions/Conditions';

/**
 * Creates a Conditions object based on the input HttpRequest.
 */
export abstract class ConditionsParser extends AsyncHandler<HttpRequest, Conditions | undefined> {}
