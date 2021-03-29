/**
 * A class that validates if a someone owns a WebId. Will
 * throw an error if the WebId is not valid.
 */
export interface WebIdOwnershipValidator {
  assertWebIdOwnership: (webId: string, interactionId: string) => Promise<void>;
}
