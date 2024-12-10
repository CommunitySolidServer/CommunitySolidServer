import { getLoggerFor } from 'global-logger-factory';
import { concat } from '../util/IterableUtil';
import { IdentifierMap, IdentifierSetMultiMap } from '../util/map/IdentifierMap';
import { getDefault } from '../util/map/MapUtil';
import { ensureTrailingSlash, trimTrailingSlashes } from '../util/PathUtil';
import type { PermissionReaderInput } from './PermissionReader';
import { PermissionReader } from './PermissionReader';
import type { AccessMap, MultiPermissionMap } from './permissions/Permissions';

/**
 * Redirects requests to specific PermissionReaders based on their identifier.
 * The keys are regular expression strings.
 * The regular expressions should all start with a slash
 * and will be evaluated relative to the base URL.
 *
 * Will error if no match is found.
 */
export class PathBasedReader extends PermissionReader {
  protected readonly logger = getLoggerFor(this);

  protected readonly baseUrl: string;
  private readonly paths: Map<RegExp, PermissionReader>;
  protected readonly defaultReader?: PermissionReader;

  public constructor(baseUrl: string, paths: Record<string, PermissionReader>, defaultReader?: PermissionReader) {
    super();
    this.baseUrl = ensureTrailingSlash(baseUrl);
    const entries = Object.entries(paths)
      .map(([ key, val ]): [RegExp, PermissionReader] => [ new RegExp(key, 'u'), val ]);
    this.paths = new Map(entries);
    this.defaultReader = defaultReader;
  }

  public async canHandle(input: PermissionReaderInput): Promise<void> {
    for (const [ reader, readerModes ] of this.matchReaders(input.requestedModes)) {
      await reader.canHandle({ credentials: input.credentials, requestedModes: readerModes });
    }
  }

  public async handle(input: PermissionReaderInput): Promise<MultiPermissionMap> {
    const results: MultiPermissionMap[] = [];
    for (const [ reader, readerModes ] of this.matchReaders(input.requestedModes)) {
      results.push(await reader.handle({ credentials: input.credentials, requestedModes: readerModes }));
    }
    return new IdentifierMap(concat(results));
  }

  /**
   *  Returns for each reader the matching part of the access map.
   */
  protected matchReaders(accessMap: AccessMap): Map<PermissionReader, AccessMap> {
    const result = new Map<PermissionReader, AccessMap>();
    for (const [ identifier, modes ] of accessMap.entrySets()) {
      const reader = this.findReader(identifier.path);
      if (reader) {
        const matches = getDefault(result, reader, (): AccessMap => new IdentifierSetMultiMap());
        matches.set(identifier, modes);
      }
    }
    return result;
  }

  /**
   * Find the PermissionReader corresponding to the given path.
   */
  protected findReader(path: string): PermissionReader | undefined {
    if (path.startsWith(this.baseUrl)) {
      // We want to keep the leading slash
      const relative = path.slice(trimTrailingSlashes(this.baseUrl).length);
      for (const [ regex, reader ] of this.paths) {
        if (regex.test(relative)) {
          this.logger.debug(`Permission reader found for ${path}`);
          return reader;
        }
      }
    }
    return this.defaultReader;
  }
}
