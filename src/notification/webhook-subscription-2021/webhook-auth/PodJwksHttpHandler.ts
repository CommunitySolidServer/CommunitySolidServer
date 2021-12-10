import type { JwksKeyGenerator } from '../../../identity/configuration/JwksKeyGenerator';
import type { HttpHandlerInput } from '../../../server/HttpHandler';
import { HttpHandler } from '../../../server/HttpHandler';

export interface PodJwksHttpHandlerArgs {
  jwksKeyGenerator: JwksKeyGenerator;
}

const JWKS_KEY = 'POD_JWKS';

export class PodJwksHttpHandler extends HttpHandler {
  private readonly jwksKeyGenerator: JwksKeyGenerator;

  public constructor(args: PodJwksHttpHandlerArgs) {
    super();
    this.jwksKeyGenerator = args.jwksKeyGenerator;
  }

  public async handle(input: HttpHandlerInput): Promise<void> {
    const jwksPublic = await this.jwksKeyGenerator.getPublicJwks(JWKS_KEY);

    input.response.setHeader('Content-Type', 'application/ld+json');
    input.response.write(JSON.stringify(jwksPublic));
    input.response.end();
  }
}
