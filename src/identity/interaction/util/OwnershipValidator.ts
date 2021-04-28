import { AsyncHandler } from '../../../util/handlers/AsyncHandler';

/**
 * A class that validates if a someone owns a WebId. Will
 * throw an error if the WebId is not valid.
 */
export abstract class OwnershipValidator extends AsyncHandler<{ webId: string; interactionId: string }> {}
