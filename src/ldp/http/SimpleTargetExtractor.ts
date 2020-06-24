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
    return { path: input.url };
  }
}
