import { AsyncHandler } from '../../util/handlers/AsyncHandler';

/**
 * A class that validates if a someone owns a WebId.
 * Will throw an error if the WebId is not valid or ownership could not be validated.
 * The error message should contain a description of what is wrong and how it can be resolved.
 */
export abstract class OwnershipValidator extends AsyncHandler<{ webId: string }> {}
