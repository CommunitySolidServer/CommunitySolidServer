import type { Operation } from '../../../../http/Operation';
import type { Representation } from '../../../../http/representation/Representation';
import { AsyncHandler } from '../../../../util/handlers/AsyncHandler';

export interface CredentialsHandlerBody extends Record<string, unknown> {
  email: string;
  webId: string;
}

/**
 * `body` is the parsed JSON from `operation.body.data` with the WebID of the account having been added.
 * This means that the data stream in the Operation can not be read again.
 */
export interface CredentialsHandlerInput {
  operation: Operation;
  body: CredentialsHandlerBody;
}

/**
 * Handles a request after the user has been authenticated
 * by providing a valid email/password combination in the JSON body.
 */
export abstract class CredentialsHandler extends AsyncHandler<CredentialsHandlerInput, Representation> { }
