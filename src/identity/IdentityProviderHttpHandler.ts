import type { HttpHandlerInput } from '../server/HttpHandler';
import { AsyncHandler } from '../util/AsyncHandler';
import type { IdentityProvider } from './IdentityProvider';

export type IdentityProviderHttpHandlerInput = HttpHandlerInput & {
  provider: IdentityProvider;
};

export class IdentityProviderHttpHandler extends AsyncHandler<IdentityProviderHttpHandlerInput> {
  private readonly provider: IdentityProvider;

  public constructor(provider: IdentityProvider) {
    super();
    this.provider = provider;
  }

  public async canHandle(input: HttpHandlerInput): Promise<void> {
    return this.provider.canHandle({...input, provider: this.provider});
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    return this.provider.handle({...input, provider: this.provider});
  }

  public async handleSafe(input: HttpHandlerInput): Promise<void> {
    return this.provider.handleSafe({...input, provider: this.provider});
  }
}
