import type { OidcProviderConfigurationFactory } from './configuration/OidcProviderConfigurationFactory';
import type { OidcProvider } from './OidcProvider';
import { OidcProviderFactory } from './OidcProviderFactory';
import { SolidOidcProvider } from './SolidOidcProvider';

export interface SolidOidcProviderFactoryArgs {
  issuer: string;
  configurationFactory: OidcProviderConfigurationFactory;
}

export class SolidOidcProviderFactory extends OidcProviderFactory {
  private readonly configurationFacotry: OidcProviderConfigurationFactory;
  private readonly issuer: string;

  public constructor(args: SolidOidcProviderFactoryArgs) {
    super();
    this.configurationFacotry = args.configurationFactory;
    this.issuer = args.issuer;
  }

  public async createOidcProvider(): Promise<OidcProvider> {
    const configuration = await this.configurationFacotry.createConfiguration();
    return new SolidOidcProvider(this.issuer, configuration);
  }
}
