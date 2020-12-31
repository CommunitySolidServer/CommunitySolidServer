import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import type { SolidIdentityProviderFactory } from './SolidIdentityProviderFactory';

export interface SolidIdentityProviderHttpHandlerArgs {
  providerFactory: SolidIdentityProviderFactory;
}

export class SolidIdentityProviderHttpHandler extends HttpHandler {
  private readonly providerFactory: SolidIdentityProviderFactory;

  public constructor(args: SolidIdentityProviderHttpHandlerArgs) {
    super();
    this.providerFactory = args.providerFactory;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    const provider = await this.providerFactory.createSolidIdentityProvider();
    await provider.handleSafe(input);
  }
}
