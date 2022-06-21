import type { HttpRequest } from '../../server/HttpRequest';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { Operation } from '../Operation';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { BodyParser } from './body/BodyParser';
import type { ConditionsParser } from './conditions/ConditionsParser';
import type { TargetExtractor } from './identifier/TargetExtractor';
import type { MetadataParser } from './metadata/MetadataParser';
import type { PreferenceParser } from './preferences/PreferenceParser';
import { RequestParser } from './RequestParser';

/**
 * Input parsers required for a {@link BasicRequestParser}.
 */
export interface BasicRequestParserArgs {
  targetExtractor: TargetExtractor;
  preferenceParser: PreferenceParser;
  metadataParser: MetadataParser;
  conditionsParser: ConditionsParser;
  bodyParser: BodyParser;
}

/**
 * Creates an {@link Operation} from an incoming {@link HttpRequest} by aggregating the results
 * of a {@link TargetExtractor}, {@link MetadataParser},
 * {@link ConditionsParser} and {@link BodyParser}.
 */
export class BasicRequestParser extends RequestParser {
  private readonly targetExtractor: TargetExtractor;
  private readonly preferenceParser: PreferenceParser;
  private readonly metadataParser: MetadataParser;
  private readonly conditionsParser: ConditionsParser;
  private readonly bodyParser: BodyParser;

  public constructor(args: BasicRequestParserArgs) {
    super();
    this.targetExtractor = args.targetExtractor;
    this.preferenceParser = args.preferenceParser;
    this.metadataParser = args.metadataParser;
    this.conditionsParser = args.conditionsParser;
    this.bodyParser = args.bodyParser;
  }

  public async handle(request: HttpRequest): Promise<Operation> {
    const { method } = request;
    if (!method) {
      throw new InternalServerError('No method specified on the HTTP request');
    }
    const target = await this.targetExtractor.handleSafe({ request });
    const preferences = await this.preferenceParser.handleSafe({ request });
    const metadata = new RepresentationMetadata(target);
    await this.metadataParser.handleSafe({ request, metadata });
    const conditions = await this.conditionsParser.handleSafe(request);
    const body = await this.bodyParser.handleSafe({ request, metadata });

    return { method, target, preferences, conditions, body };
  }
}
