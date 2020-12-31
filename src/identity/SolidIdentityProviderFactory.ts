import { SolidIdentityProvider } from './SolidIdentityProvider';
import type { SolidIdentityProviderConfigurationFactory } from './SolidIdentityProviderConfigurationFactory';

export interface SolidIdentityProviderFactoryArgs {
  configurationFactory: SolidIdentityProviderConfigurationFactory;
  issuer: string;
}

export class SolidIdentityProviderFactory {
  private readonly configurationFactory: SolidIdentityProviderConfigurationFactory;
  private readonly issuer: string;

  public constructor(args: SolidIdentityProviderFactoryArgs) {
    this.configurationFactory = args.configurationFactory;
    this.issuer = args.issuer;
  }

  public createSolidIdentityProvider(): SolidIdentityProvider {
    const configuration = this.configurationFactory.createConfiguration();
    return new SolidIdentityProvider(this.issuer, configuration);
  }
}
