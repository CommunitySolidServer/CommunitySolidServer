import type { SolidIdentityProvider } from './SolidIdentityProvider';
import type { HttpHandlerInput } from '../server/HttpHandler';
import { HttpHandler } from '../server/HttpHandler';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import { SolidIdentityProviderFactory } from './SolidIdentityProviderFactory';

export class SolidIdentityProviderHttpHandler extends HttpHandler {
  private readonly provider: SolidIdentityProvider;

  constructor(providerFactory: SolidIdentityProviderFactory) {
    super();
    this.provider = providerFactory.createSolidIdentityProvider();
  }

  public async canHandle(input: HttpHandlerInput): Promise<void> {
    try {
      await this.provider.canHandle(input);
    }
    catch (error: unknown) {
      throw new NotImplementedHttpError(`Solid Identity Provider cannot handle request URL ${input.request.url}`);
    }
  }

  public handle(input: HttpHandlerInput): Promise<void> {
    return this.provider.handleSafe(input);
  }
}
