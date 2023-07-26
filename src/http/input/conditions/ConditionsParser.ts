import type { HttpRequest } from '../../../server/HttpRequest';
import type { Conditions } from '../../../storage/conditions/Conditions';
import { AsyncHandler } from '../../../util/handlers/AsyncHandler';

/**
 * Creates a Conditions object based on the input HttpRequest.
 */
export abstract class ConditionsParser extends AsyncHandler<HttpRequest, Conditions | undefined> {}
