import type { HttpRequest } from '../../server/HttpRequest';
import type { Operation } from '../operations/Operation';
import type { BodyParser } from './BodyParser';
import type { PreferenceParser } from './PreferenceParser';
import { RequestParser } from './RequestParser';
import type { TargetExtractor } from './TargetExtractor';

/**
 * Input parsers required for a {@link BasicRequestParser}.
 */
export interface SimpleRequestParserArgs {
  targetExtractor: TargetExtractor;
  preferenceParser: PreferenceParser;
  bodyParser: BodyParser;
}

/**
 * Creates an {@link Operation} from an incoming {@link HttpRequest} by aggregating the results
 * of a {@link TargetExtractor}, {@link PreferenceParser}, and {@link BodyParser}.
 */
export class BasicRequestParser extends RequestParser {
  private readonly targetExtractor!: TargetExtractor;
  private readonly preferenceParser!: PreferenceParser;
  private readonly bodyParser!: BodyParser;

  public constructor(args: SimpleRequestParserArgs) {
    super();
    Object.assign(this, args);
  }

  public async canHandle(): Promise<void> {
    // Can handle all requests
  }

  public async handle(input: HttpRequest): Promise<Operation> {
    if (!input.method) {
      throw new Error('Missing method.');
    }
    const target = await this.targetExtractor.handleSafe(input);
    const preferences = await this.preferenceParser.handleSafe(input);
    const body = await this.bodyParser.handleSafe(input);

    return { method: input.method, target, preferences, body };
  }
}
