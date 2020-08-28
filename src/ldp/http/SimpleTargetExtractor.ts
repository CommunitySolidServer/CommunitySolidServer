import { TLSSocket } from 'tls';
import { format } from 'url';
import { HttpRequest } from '../../server/HttpRequest';
import { ResourceIdentifier } from '../representation/ResourceIdentifier';
import { TargetExtractor } from './TargetExtractor';

/**
 * Extracts an identifier from an incoming {@link HttpRequest}.
 * Simply takes the input URl without any parsing/cleaning.
 */
export class SimpleTargetExtractor extends TargetExtractor {
  public async canHandle(input: HttpRequest): Promise<void> {
    if (!input.url) {
      throw new Error('Missing URL.');
    }
  }

  public async handle(input: HttpRequest): Promise<ResourceIdentifier> {
    const isHttps = input.connection && (input.connection as TLSSocket).encrypted;
    const url = format({
      protocol: `http${isHttps ? 's' : ''}`,
      host: input.headers.host,
      pathname: input.url,
    });

    return { path: url };
  }
}
