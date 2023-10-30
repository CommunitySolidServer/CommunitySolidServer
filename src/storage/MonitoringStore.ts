import type { Term } from '@rdfjs/types';
import type { Patch } from '../http/representation/Patch';
import type { Representation } from '../http/representation/Representation';
import type { RepresentationPreferences } from '../http/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { BaseActivityEmitter } from '../server/notifications/ActivityEmitter';
import { AS, SOLID_AS } from '../util/Vocabularies';
import type { Conditions } from './conditions/Conditions';
import type { ChangeMap, ResourceStore } from './ResourceStore';

// The ActivityStream terms for which we emit an event
const knownActivities = [ AS.terms.Add, AS.terms.Create, AS.terms.Delete, AS.terms.Remove, AS.terms.Update ];

/**
 * Store that notifies listeners of changes to its source
 * by emitting a `changed` event.
 */
export class MonitoringStore<T extends ResourceStore = ResourceStore>
  extends BaseActivityEmitter implements ResourceStore {
  private readonly source: T;

  public constructor(source: T) {
    super();
    this.source = source;
  }

  public async hasResource(identifier: ResourceIdentifier): Promise<boolean> {
    return this.source.hasResource(identifier);
  }

  public async getRepresentation(
    identifier: ResourceIdentifier,
    preferences: RepresentationPreferences,
    conditions?: Conditions,
  ): Promise<Representation> {
    return this.source.getRepresentation(identifier, preferences, conditions);
  }

  public async addResource(
    container: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    return this.emitChanged(await this.source.addResource(container, representation, conditions));
  }

  public async deleteResource(
    identifier: ResourceIdentifier,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    return this.emitChanged(await this.source.deleteResource(identifier, conditions));
  }

  public async setRepresentation(
    identifier: ResourceIdentifier,
    representation: Representation,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    return this.emitChanged(await this.source.setRepresentation(identifier, representation, conditions));
  }

  public async modifyResource(
    identifier: ResourceIdentifier,
    patch: Patch,
    conditions?: Conditions,
  ): Promise<ChangeMap> {
    return this.emitChanged(await this.source.modifyResource(identifier, patch, conditions));
  }

  private emitChanged(changes: ChangeMap): ChangeMap {
    for (const [ identifier, metadata ] of changes) {
      const activity = metadata.get(SOLID_AS.terms.activity);
      if (this.isKnownActivity(activity)) {
        this.emit('changed', identifier, activity, metadata);
        this.emit(activity.value, identifier, metadata);
      }
    }

    return changes;
  }

  private isKnownActivity(term?: Term): term is typeof knownActivities[number] {
    return Boolean(term && knownActivities.some((entry): boolean => entry.equals(term)));
  }
}
