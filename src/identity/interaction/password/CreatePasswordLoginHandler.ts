import { boolean, object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { JsonRepresentation } from '../InteractionUtil';
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
    console.log("Handling thing.");
    await validateWithError(inSchema, input.json);
    console.log(0);
    const accountResponse = await this.createAccountHandler.login();
    const newInput = { ...input, accountId: accountResponse.json.accountId };
    console.log(1);
    await this.createPasswordHandler.handleSafe(newInput);
    console.log(2);
    await this.createPodHandler.handleSafe(newInput);
    console.log(3);
    const toReturn = await this.passwordLoginHandler.handleSafe(newInput);
    console.log(toReturn);
    return toReturn;
  }
}
