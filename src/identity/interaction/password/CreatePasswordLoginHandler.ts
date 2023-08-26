import { boolean, object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import { assertOidcInteraction, finishInteraction, type JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler, type JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';
import { CreatePasswordHandler } from './CreatePasswordHandler';
import { CreatePodHandler } from '../pod/CreatePodHandler';
import { PasswordLoginHandler } from './PasswordLoginHandler';
import { CreateAccountHandler } from '../account/CreateAccountHandler';

const inSchema = object({
  // Store e-mail addresses in lower case
  email: string().trim().email().lowercase()
    .required(),
  password: string().trim().min(1).required(),
  name: string().trim().min(1).required(),
  remember: boolean().default(false),
});

export interface CreatePasswordLoginHandlerArgs {
  createAccountHandler: CreateAccountHandler;
  createPasswordHandler: CreatePasswordHandler;
  createPodHandler: CreatePodHandler;
  passwordLoginHandler: PasswordLoginHandler;
}

/**
 * Handles the submission of the Login Form and logs the user in.
 */
export class CreatePasswordLoginHandler extends JsonInteractionHandler implements JsonView {
  protected readonly logger = getLoggerFor(this);

  private readonly createAccountHandler: CreateAccountHandler;
  private readonly createPasswordHandler: CreatePasswordHandler;
  private readonly createPodHandler: CreatePodHandler;
  private readonly passwordLoginHandler: PasswordLoginHandler;

  public constructor(args: CreatePasswordLoginHandlerArgs) {
    super();
    this.createAccountHandler = args.createAccountHandler;
    this.createPasswordHandler = args.createPasswordHandler;
    this.createPodHandler = args.createPodHandler;
    this.passwordLoginHandler = args.passwordLoginHandler;
  }

  public async getView(): Promise<JsonRepresentation> {
    return { json: parseSchema(inSchema) };
  }

  public async handle(input: JsonInteractionHandlerInput): Promise<JsonRepresentation> {
    assertOidcInteraction(input.oidcInteraction);
    await validateWithError(inSchema, input.json);
    const accountResponse = await this.createAccountHandler.login();
    const newInput = { ...input, accountId: accountResponse.json.accountId };
    await this.createPasswordHandler.handleSafe(newInput);
    await this.createPodHandler.handleSafe(newInput);
    const loginInfo = await this.passwordLoginHandler.login(newInput);
    const { oidcInteraction, ...restInput } = input;

    // We pass in input without the OIDC interaction so that it doesn't finisht the interaction, but we can get metadata
    const toReturn = await this.passwordLoginHandler.handle(restInput);
    const location =  await finishInteraction(input.oidcInteraction, { create: true, ...loginInfo.json }, true);
    toReturn.json.location = location;
    return toReturn;

  }
}
