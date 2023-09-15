import { boolean, object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { AccountStore } from '../account/util/AccountStore';
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
  remember: boolean().default(false),
});

export interface PasswordLoginHandlerArgs {
  accountStore: AccountStore;
  passwordStore: PasswordStore;
  cookieStore: CookieStore;
}

/**
 * Handles the submission of the Login Form and logs the user in.
 */
export class PasswordLoginHandler extends ResolveLoginHandler implements JsonView {
  protected readonly logger = getLoggerFor(this);

  private readonly passwordStore: PasswordStore;

  public constructor(args: PasswordLoginHandlerArgs) {
    super(args.accountStore, args.cookieStore);
    this.passwordStore = args.passwordStore;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  public async login({ json }: JsonInteractionHandlerInput): Promise<JsonRepresentation<LoginOutputType>> {
    const { email, password, remember } = await validateWithError(inSchema, json);
    // Try to log in, will error if email/password combination is invalid
    const { accountId } = await this.passwordStore.authenticate(email, password);
    this.logger.debug(`Logging in user ${email}`);

    return { json: { accountId, remember }};
  }
}
