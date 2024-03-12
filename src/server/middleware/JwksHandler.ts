import { HttpHandler, type HttpHandlerInput } from '../HttpHandler';
import type { JwkGenerator } from '../../identity/configuration/JwkGenerator';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';

export class JwksHandler extends HttpHandler {
  public constructor(
    private readonly path: string,
    private readonly generator: JwkGenerator,
  ) {
    super();
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    const { method, url } = request;

    if (![ 'GET', 'HEAD' ].includes(method ?? '')) {
      throw new MethodNotAllowedHttpError(
        method ? [ method ] : undefined,
        `Only GET or HEAD requests can target the storage description.`,
      );
    }

    if (url !== this.path) {
      throw new NotImplementedHttpError(`This handler is not configured for ${url}`);
    }
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    const key = await this.generator.getPublicKey();

    // eslint-disable-next-line ts/naming-convention -- HTTP header
    response.writeHead(200, { 'content-type': 'application/json' });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    response.end(JSON.stringify({ keys: [ Object.assign(key, { kid: 'TODO' }) ]}));
  }
}
