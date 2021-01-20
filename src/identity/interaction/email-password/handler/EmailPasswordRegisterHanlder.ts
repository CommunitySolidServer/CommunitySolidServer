import assert from 'assert';
import { getLoggerFor } from '../../../../logging/LogUtil';
import type { IdPInteractionHttpHandlerInput } from '../../IdPInteractionHttpHandler';
import { IdPInteractionHttpHandler } from '../../IdPInteractionHttpHandler';
import { getFormDataRequestBody } from '../../util/getFormDataRequestBody';
import type { IdpRenderHandler } from '../../util/IdpRenderHandler';
import type { WebIdOwnershipValidator } from '../../util/WebIdOwnershipValidator';

const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/u;

export class EmailPasswordRegisterHandler extends IdPInteractionHttpHandler {
  private readonly renderHandler: IdpRenderHandler;
  private readonly webIdOwnershipValidator: WebIdOwnershipValidator;
  private readonly logger = getLoggerFor(this);

  public constructor(renderHandler: IdpRenderHandler, webIdOwnershipValidator: WebIdOwnershipValidator) {
    super();
    this.renderHandler = renderHandler;
    this.webIdOwnershipValidator = webIdOwnershipValidator;
  }

  public async handle(input: IdPInteractionHttpHandlerInput): Promise<void> {
    const interactionDetails = await input.provider.interactionDetails(input.request, input.response);
    let prefilledEmail = '';
    let prefilledWebId = '';
    try {
      const { email, webId, password, confirmPassword } = await getFormDataRequestBody(input.request);

      // Qualify email
      assert(typeof email === 'string', 'Email required');
      assert(emailRegex.test(email), 'Invalid email');
      prefilledEmail = email;

      // Qualify WebId
      assert(typeof webId === 'string', 'WebId required');
      prefilledWebId = webId;
      await this.webIdOwnershipValidator.assertWebId(webId);

      // Qualify password
      assert(typeof password === 'string', 'Password required');
      assert(typeof confirmPassword === 'string', 'Confirm Password required');
      assert(password === confirmPassword, 'Password and confirm password do not match');

      // Perform registration
      // Validate that the provided webId is okay
    } catch (err: unknown) {
      const errorMessage: string = err instanceof Error ? err.message : 'An unknown error occurred';
      await this.renderHandler.handle({
        response: input.response,
        props: {
          details: interactionDetails,
          errorMessage,
          prefilled: {
            email: prefilledEmail,
            webId: prefilledWebId,
          },
        },
      });
    }
  }
}
