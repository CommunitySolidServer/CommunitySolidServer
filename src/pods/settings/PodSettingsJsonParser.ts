import type { Representation } from '../../ldp/representation/Representation';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readableToString } from '../../util/StreamUtil';
import type { PodSettings } from './PodSettings';
import { PodSettingsParser } from './PodSettingsParser';
import Dict = NodeJS.Dict;

const requiredKeys: (keyof PodSettings)[] = [ 'login', 'webId' ];

/**
 * A parser that extracts PodSettings data from a JSON body.
 */
export class PodSettingsJsonParser extends PodSettingsParser {
  public async canHandle(input: Representation): Promise<void> {
    if (!input.metadata.contentType || !this.isJSON(input.metadata.contentType)) {
      throw new NotImplementedHttpError('Only JSON data is supported');
    }
  }

  public async handle(input: Representation): Promise<PodSettings> {
    const result = JSON.parse(await readableToString(input.data));
    this.isValid(result);
    return result;
  }

  private isJSON(mediaType: string): boolean {
    return mediaType === 'application/json' || mediaType.endsWith('+json');
  }

  /**
   * Checks if all the required PodSettings keys are there.
   */
  private isValid(data: Dict<string>): asserts data is PodSettings {
    for (const key of requiredKeys) {
      if (!data[key]) {
        throw new BadRequestHttpError(`Input data is missing key ${key}`);
      }
    }
  }
}
