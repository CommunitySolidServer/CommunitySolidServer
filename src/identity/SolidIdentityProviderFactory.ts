import { TargetExtractor } from '../ldp/http/TargetExtractor';
import { SolidIdentityProvider } from './SolidIdentityProvider';
import type { SolidIdentityProviderConfigurationFactory } from './SolidIdentityProviderConfigurationFactory';

export interface SolidIdentityProviderFactoryArgs {
  configurationFactory: SolidIdentityProviderConfigurationFactory;
  issuer: string;
  targetExtractor: TargetExtractor;
}

export class SolidIdentityProviderFactory {
  private readonly configurationFactory: SolidIdentityProviderConfigurationFactory;
  private readonly issuer: string;
  private readonly targetExtractor: TargetExtractor;

  public constructor(args: SolidIdentityProviderFactoryArgs) {
    this.configurationFactory = args.configurationFactory;
    this.issuer = args.issuer;
    this.targetExtractor = args.targetExtractor;
  }

  public createSolidIdentityProvider(): SolidIdentityProvider {
    const configuration = this.configurationFactory.createConfiguration();
    return new SolidIdentityProvider(this.targetExtractor, this.issuer, configuration);
  }
}
