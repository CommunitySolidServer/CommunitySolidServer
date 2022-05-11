import type { BodyParser } from './body/BodyParser';
import type { ConditionsParser } from './conditions/ConditionsParser';
import type { TargetExtractor } from './identifier/TargetExtractor';
import type { MetadataParser } from './metadata/MetadataParser';
import type { PreferenceParser } from './preferences/PreferenceParser';

/**
 * Stores the classes necessary to create an Operation.
 */
export class RequestParser {
  public constructor(
    public readonly targetExtractor: TargetExtractor,
    public readonly preferenceParser: PreferenceParser,
    public readonly metadataParser: MetadataParser,
    public readonly conditionsParser: ConditionsParser,
    public readonly bodyParser: BodyParser,
  ) {}
}
