import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import type { SolidIdentityProvider } from './SolidIdentityProvider';

export class SolidIdentityProviderHttpHandler extends HttpHandler {
  private readonly provider: SolidIdentityProvider;

  public constructor(provider: SolidIdentityProvider) {
    super();
    this.provider = provider;
  }

  public async canHandle(input: HttpHandlerInput): Promise<void> {
    return this.provider.canHandle(input);
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    return this.provider.handleSafe(input);
  }
}
