import { Parser } from 'n3';
import { OkResponseDescription } from '../../../http/output/response/OkResponseDescription';
import type { ResponseDescription } from '../../../http/output/response/ResponseDescription';
import { BasicRepresentation } from '../../../http/representation/BasicRepresentation';
import { TEXT_TURTLE } from '../../../util/ContentTypes';
import { createErrorMessage } from '../../../util/errors/ErrorUtil';
import { trimTrailingSlashes } from '../../../util/PathUtil';
import type { OperationHttpHandlerInput } from '../../OperationHttpHandler';
import { OperationHttpHandler } from '../../OperationHttpHandler';

/**
 * The WebHookSubscription2021 requires the server to have a WebID
 * that is used during the generation of the DPoP headers.
 * There are no real specifications about what this should contain or look like,
 * so we just return a Turtle document that contains a solid:oidcIssuer triple for now.
 * This way we confirm that our server was allowed to sign the token.
 */
export class WebHookWebId extends OperationHttpHandler {
  private readonly turtle: string;

  public constructor(baseUrl: string) {
    super();

    this.turtle = `@prefix solid: <http://www.w3.org/ns/solid/terms#>.
<> solid:oidcIssuer <${trimTrailingSlashes(baseUrl)}>.`;

    // This will throw an error if something is wrong with the issuer URL
    const parser = new Parser();
    try {
      parser.parse(this.turtle);
    } catch (error: unknown) {
      throw new Error(`Invalid issuer URL: ${createErrorMessage(error)}`);
    }
  }

  public async handle(input: OperationHttpHandlerInput): Promise<ResponseDescription> {
    const representation = new BasicRepresentation(this.turtle, input.operation.target, TEXT_TURTLE);
    return new OkResponseDescription(representation.metadata, representation.data);
  }
}
