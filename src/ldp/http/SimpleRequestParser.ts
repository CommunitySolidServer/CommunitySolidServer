import { BodyParser } from './BodyParser';
import { HttpRequest } from '../../server/HttpRequest';
import { Operation } from '../operations/Operation';
import { PreferenceParser } from './PreferenceParser';
import { RequestParser } from './RequestParser';
import { TargetExtractor } from './TargetExtractor';

/**
 * Input parsers required for a {@link SimpleRequestParser}.
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
export class SimpleRequestParser extends RequestParser {
  private readonly targetExtractor: TargetExtractor;
  private readonly preferenceParser: PreferenceParser;
  private readonly bodyParser: BodyParser;

  public constructor(args: SimpleRequestParserArgs) {
    super();
    Object.assign(this, args);
  }

  public async canHandle(input: HttpRequest): Promise<void> {
    if (!input.url) {
      throw new Error('Missing URL.');
    }
    if (!input.method) {
      throw new Error('Missing method.');
    }
  }

  public async handle(input: HttpRequest): Promise<Operation> {
    const target = await this.targetExtractor.handleSafe(input);
    const preferences = await this.preferenceParser.handleSafe(input);
    const body = await this.bodyParser.handleSafe(input);

    return { method: input.method, target, preferences, body };
  }
}
