import type { Representation } from '../../ldp/representation/Representation';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { readableToString } from '../../util/StreamUtil';
import type { Agent } from './Agent';
import { AgentParser } from './AgentParser';
import Dict = NodeJS.Dict;

const requiredKeys: (keyof Agent)[] = [ 'login', 'webId' ];
const optionalKeys: (keyof Agent)[] = [ 'name', 'email' ];
const agentKeys: Set<keyof Agent> = new Set(requiredKeys.concat(optionalKeys));

/**
 * A parser that extracts Agent data from a JSON body.
 */
export class AgentJsonParser extends AgentParser {
  public async canHandle(input: Representation): Promise<void> {
    if (!input.metadata.contentType || !this.isJSON(input.metadata.contentType)) {
      throw new NotImplementedHttpError('Only JSON data is supported');
    }
  }

  public async handle(input: Representation): Promise<Agent> {
    const result = JSON.parse(await readableToString(input.data));
    this.isValidAgent(result);
    return result;
  }

  private isJSON(mediaType: string): boolean {
    return mediaType === 'application/json' || mediaType.endsWith('+json');
  }

  /**
   * Checks if all keys in the object are valid Agent keys and if all required keys are there.
   */
  private isValidAgent(data: Dict<string>): asserts data is Agent {
    for (const key of Object.keys(data)) {
      if (!agentKeys.has(key as keyof Agent)) {
        throw new BadRequestHttpError(`${key} is not a valid Agent key`);
      }
    }
    for (const key of requiredKeys) {
      if (!data[key]) {
        throw new BadRequestHttpError(`Input data is missing Agent key ${key}`);
      }
    }
  }
}
