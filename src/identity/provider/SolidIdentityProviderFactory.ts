import type { OidcProviderConfigurationFactory } from './configuration/OidcProviderConfigurationFactory';
import { SolidIdentityProvider } from './SolidIdentityProvider';

export interface SolidIdentityProviderFactoryArgs {
  issuer: string;
  configurationFactory: OidcProviderConfigurationFactory;
}

export class SolidIdentityProviderFactory {
  private readonly configurationFacotry: OidcProviderConfigurationFactory;
  private readonly issuer: string;

  public constructor(args: SolidIdentityProviderFactoryArgs) {
    this.configurationFacotry = args.configurationFactory;
    this.issuer = args.issuer;
  }

  public async createSolidIdentityProvider(): Promise<SolidIdentityProvider> {
    const configuration = await this.configurationFacotry.createConfiguration();
    return new SolidIdentityProvider(this.issuer, configuration);
  }
}
