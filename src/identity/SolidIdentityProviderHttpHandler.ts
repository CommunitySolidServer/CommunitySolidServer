import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import type { SolidIdentityProvider } from './SolidIdentityProvider';

export interface SolidIdentityProviderHttpHandlerArgs {
  provider: SolidIdentityProvider;
}

export class SolidIdentityProviderHttpHandler extends HttpHandler {
  private readonly provider: SolidIdentityProvider;

  public constructor(args: SolidIdentityProviderHttpHandlerArgs) {
    super();
    this.provider = args.provider;
  }

  public async canHandle(input: HttpHandlerInput): Promise<void> {
    await this.provider.canHandle(input);
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    return this.provider.handleSafe(input);
  }
}
