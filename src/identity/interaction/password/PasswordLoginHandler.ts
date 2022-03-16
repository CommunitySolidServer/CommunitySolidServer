import { object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { AccountIdRoute } from '../account/AccountIdRoute';
import type { CookieStore } from '../account/util/CookieStore';
import type { JsonRepresentation } from '../InteractionUtil';
import type { JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import type { LoginOutputType } from '../login/ResolveLoginHandler';
import { ResolveLoginHandler } from '../login/ResolveLoginHandler';
import { parseSchema, validateWithError } from '../YupUtil';
import type { PasswordStore } from './util/PasswordStore';

const inSchema = object({
  email: string().trim().email().required(),
  password: string().trim().required(),
});

/**
 * Handles the submission of the Login Form and logs the user in.
 */
export class PasswordLoginHandler extends ResolveLoginHandler implements JsonView {
  protected readonly logger = getLoggerFor(this);

  private readonly passwordStore: PasswordStore;

  public constructor(passwordStore: PasswordStore, cookieStore: CookieStore, accountRoute: AccountIdRoute) {
    super(cookieStore, accountRoute);
    this.passwordStore = passwordStore;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  public async login({ json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<LoginOutputType>> {
    const { email, password } = await validateWithError(inSchema, json);
    // Try to log in, will error if email/password combination is invalid
    const accountId = await this.passwordStore.authenticate(email, password);
    this.logger.debug(`Logging in user ${email}`);

    return { json: { accountId }};
  }
}
