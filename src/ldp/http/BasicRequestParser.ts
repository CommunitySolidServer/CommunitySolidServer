import type { HttpRequest } from '../../server/HttpRequest';
import type { Operation } from '../operations/Operation';
import type { BodyParser } from './BodyParser';
import type { MetadataExtractor } from './metadata/MetadataExtractor';
import type { PreferenceParser } from './PreferenceParser';
import { RequestParser } from './RequestParser';
import type { TargetExtractor } from './TargetExtractor';

/**
 * Input parsers required for a {@link BasicRequestParser}.
 */
export interface SimpleRequestParserArgs {
  targetExtractor: TargetExtractor;
  preferenceParser: PreferenceParser;
  metadataExtractor: MetadataExtractor;
  bodyParser: BodyParser;
}

/**
 * Creates an {@link Operation} from an incoming {@link HttpRequest} by aggregating the results
 * of a {@link TargetExtractor}, {@link PreferenceParser}, {@link MetadataExtractor}, and {@link BodyParser}.
 */
export class BasicRequestParser extends RequestParser {
  private readonly targetExtractor!: TargetExtractor;
  private readonly preferenceParser!: PreferenceParser;
  private readonly metadataExtractor!: MetadataExtractor;
  private readonly bodyParser!: BodyParser;

  public constructor(args: SimpleRequestParserArgs) {
    super();
    Object.assign(this, args);
  }

  public async handle(request: HttpRequest): Promise<Operation> {
    const { method } = request;
    if (!method) {
      throw new Error('No method specified on the HTTP request');
    }
    const target = await this.targetExtractor.handleSafe({ request });
    const preferences = await this.preferenceParser.handleSafe({ request });
    const metadata = await this.metadataExtractor.handleSafe({ request, target });
    const body = await this.bodyParser.handleSafe({ request, metadata });

    return { method, target, preferences, body };
  }
}
