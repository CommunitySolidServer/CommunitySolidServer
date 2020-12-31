import { SolidIdentityProvider } from './SolidIdentityProvider';
import type { SolidIdentityProviderConfigurationFactory } from './SolidIdentityProviderConfigurationFactory';

export interface SolidIdentityProviderFactoryArgs {
  issuer: string;
  configurationFactory: SolidIdentityProviderConfigurationFactory;
}

export class SolidIdentityProviderFactory {
  private readonly configurationFacotry: SolidIdentityProviderConfigurationFactory;
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
