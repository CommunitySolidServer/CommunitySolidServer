import { TargetExtractor } from '../ldp/http/TargetExtractor';
import { SolidIdentityProvider } from './SolidIdentityProvider';
import type { SolidIdentityProviderConfigurationFactory } from './SolidIdentityProviderConfigurationFactory';

export interface SolidIdentityProviderFactoryArgs {
  issuer: string;
  configurationFactory: SolidIdentityProviderConfigurationFactory;
}

export class SolidIdentityProviderFactory {
  private readonly configurationFacotry: SolidIdentityProviderConfigurationFactory;
  private readonly issuer: string;
  private readonly targetExtractor: TargetExtractor;

  public constructor(targetExtractor: TargetExtractor, args: SolidIdentityProviderFactoryArgs) {
    this.configurationFacotry = args.configurationFactory;
    this.issuer = args.issuer;
    this.targetExtractor = targetExtractor;
  }

  public async createSolidIdentityProvider(): Promise<SolidIdentityProvider> {
    const configuration = await this.configurationFacotry.createConfiguration();
    return new SolidIdentityProvider(this.targetExtractor, this.issuer, configuration);
  }
}
