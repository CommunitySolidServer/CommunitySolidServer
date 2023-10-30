import assert from 'node:assert';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { isContainerIdentifier } from '../util/PathUtil';
import { isValidFileName } from '../util/StringUtil';
import type { Conditions } from './conditions/Conditions';
import { cleanPreferences, matchesMediaType } from './conversion/ConversionUtil';
import { PassthroughStore } from './PassthroughStore';
import type { ResourceStore } from './ResourceStore';

/**
 * Allow containers to have a custom representation.
 * The index representation will be returned when the following conditions are fulfilled:
 *  * The request targets a container.
 *  * A resource with the given `indexName` exists in the container. (default: "index.html")
 *  * The highest weighted preference matches the `mediaRange` (default: "text/html")
 * Otherwise the request will be passed on to the source store.
 * In case the index representation should always be returned when it exists,
 * the `mediaRange` should be set to "\*∕\*".
 *
 * Note: this functionality is not yet part of the specification. Relevant issues are:
 * - https://github.com/solid/specification/issues/69
 * - https://github.com/solid/specification/issues/198
 * - https://github.com/solid/specification/issues/109
 * - https://github.com/solid/web-access-control-spec/issues/36
 */
export class IndexRepresentationStore extends PassthroughStore {
  private readonly indexName: string;
  private readonly mediaRange: string;

  public constructor(source: ResourceStore, indexName = 'index.html', mediaRange = 'text/html') {
    super(source);
    assert(isValidFileName(indexName), 'Invalid index name');
    this.indexName = indexName;
    this.mediaRange = mediaRange;
  }

  public async getRepresentation(
    identifier: ResourceIdentifier,
    preferences: RepresentationPreferences,
    conditions?: Conditions,
  ): Promise<Representation> {
    if (isContainerIdentifier(identifier) && this.matchesPreferences(preferences)) {
      try {
        const indexIdentifier = { path: `${identifier.path}${this.indexName}` };
        const index = await this.source.getRepresentation(indexIdentifier, preferences, conditions);
        // We only care about the container metadata so preferences don't matter
        const container = await this.source.getRepresentation(identifier, {}, conditions);
        container.data.destroy();

        // Uses the container metadata but with the index content-type.
        // There is potential metadata loss if there is more representation-specific metadata,
        // but that can be looked into once the issues above are resolved.
        const { contentType } = index.metadata;
        index.metadata = container.metadata;
        index.metadata.contentType = contentType;

        return index;
      } catch (error: unknown) {
        if (!NotFoundHttpError.isInstance(error)) {
          throw error;
        }
      }
    }

    return this.source.getRepresentation(identifier, preferences, conditions);
  }

  /**
   * Makes sure the stored media range explicitly matches the highest weight preference.
   */
  private matchesPreferences(preferences: RepresentationPreferences): boolean {
    // Always match */*
    if (this.mediaRange === '*/*') {
      return true;
    }

    // Otherwise, determine if an explicit match has the highest weight
    const types = cleanPreferences(preferences.type);
    const max = Math.max(...Object.values(types));
    return Object.entries(types).some(([ range, weight ]): boolean =>
      range !== '*/*' && (max - weight) < 0.01 && matchesMediaType(range, this.mediaRange));
  }
}
