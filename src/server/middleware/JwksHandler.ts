import { REQUEST_METHOD } from '@solid/access-token-verifier/dist/constant/REQUEST_METHOD';
import { HttpHandler, type HttpHandlerInput } from '../HttpHandler';
import type { JwkGenerator } from '../../identity/configuration/JwkGenerator';
import { MethodNotAllowedHttpError } from '../../util/errors/MethodNotAllowedHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';

const allowedMethods = new Set<string | undefined>([ 'GET', 'HEAD' ]);
const methodsNotAllowed: string[] = [ ...REQUEST_METHOD ].filter((method): boolean => !allowedMethods.has(method));

export class JwksHandler extends HttpHandler {
  public constructor(
    private readonly path: string,
    private readonly generator: JwkGenerator,
  ) {
    super();
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    const { method, url } = request;

    if (!allowedMethods.has(method)) {
      throw new MethodNotAllowedHttpError(
        methodsNotAllowed,
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
