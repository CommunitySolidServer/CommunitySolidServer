import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { GenericEventEmitter } from '../../util/GenericEventEmitter';
import { createGenericEventEmitterClass } from '../../util/GenericEventEmitter';
import type { AS, VocabularyTerm, VocabularyValue } from '../../util/Vocabularies';

/**
 * An event emitter used to report changes made to resources.
 * Both generic `change` events and ActivityStream-specific events are emitted.
 */
export type ActivityEmitter =
  GenericEventEmitter<
    'changed',
    (target: ResourceIdentifier, activity: VocabularyTerm<typeof AS>, metadata: RepresentationMetadata) => void
  >
  &
  GenericEventEmitter<
    VocabularyValue<typeof AS>,
    (target: ResourceIdentifier, metadata: RepresentationMetadata) => void
  >;

/**
 * A class implementation of {@link ActivityEmitter}.
 */
// eslint-disable-next-line ts/naming-convention
export const BaseActivityEmitter = createGenericEventEmitterClass<ActivityEmitter>();
