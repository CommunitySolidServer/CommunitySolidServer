import type { HttpRequest } from '../../server/HttpRequest';
import { InternalServerError } from '../../util/errors/InternalServerError';
import type { Operation } from '../operations/Operation';
import { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { BodyParser } from './BodyParser';
import type { MetadataParser } from './metadata/MetadataParser';
import type { PreferenceParser } from './PreferenceParser';
import { RequestParser } from './RequestParser';
import type { TargetExtractor } from './TargetExtractor';

/**
 * Input parsers required for a {@link BasicRequestParser}.
 */
export interface BasicRequestParserArgs {
  targetExtractor: TargetExtractor;
  preferenceParser: PreferenceParser;
  metadataParser: MetadataParser;
  bodyParser: BodyParser;
}

/**
 * Creates an {@link Operation} from an incoming {@link HttpRequest} by aggregating the results
 * of a {@link TargetExtractor}, {@link PreferenceParser}, {@link MetadataParser}, and {@link BodyParser}.
 */
export class BasicRequestParser extends RequestParser {
  private readonly targetExtractor!: TargetExtractor;
  private readonly preferenceParser!: PreferenceParser;
  private readonly metadataParser!: MetadataParser;
  private readonly bodyParser!: BodyParser;

  public constructor(args: BasicRequestParserArgs) {
    super();
    Object.assign(this, args);
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
    const body = await this.bodyParser.handleSafe({ request, metadata });

    return { method, target, preferences, body };
  }
}
