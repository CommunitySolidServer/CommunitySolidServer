import { boolean, object, string } from 'yup';
import { getLoggerFor } from '../../../logging/LogUtil';
import type { JsonRepresentation } from '../InteractionUtil';
import { JsonInteractionHandler, type JsonInteractionHandlerInput } from '../JsonInteractionHandler';
import type { JsonView } from '../JsonView';
import { parseSchema, validateWithError } from '../YupUtil';
import { CreatePasswordHandler } from './CreatePasswordHandler';
import { CreatePodHandler } from '../pod/CreatePodHandler';
import { PasswordLoginHandler } from './PasswordLoginHandler';

const inSchema = object({
  // Store e-mail addresses in lower case
  email: string().trim().email().lowercase()
    .required(),
  password: string().trim().min(1).required(),
  name: string().trim().min(1).required(),
  remember: boolean().default(false),
});

export interface CreatePasswordLoginHandlerArgs {
  createPasswordHandler: CreatePasswordHandler;
  createPodHandler: CreatePodHandler;
  passwordLoginHandler: PasswordLoginHandler;
}

/**
 * Handles the submission of the Login Form and logs the user in.
 */
export class CreatePasswordLoginHandler extends JsonInteractionHandler implements JsonView {
  protected readonly logger = getLoggerFor(this);

  private readonly createPasswordHandler: CreatePasswordHandler;
  private readonly createPodHandler: CreatePodHandler;
  private readonly passwordLoginHandler: PasswordLoginHandler;

  public constructor(args: CreatePasswordLoginHandlerArgs) {
    super();
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
    console.log(1);
    await this.createPasswordHandler.handleSafe(input);
    console.log(2);
    await this.createPodHandler.handleSafe(input);
    console.log(3);
    const toReturn = await this.passwordLoginHandler.handleSafe(input);
    console.log(toReturn);
    return toReturn;
  }
}
