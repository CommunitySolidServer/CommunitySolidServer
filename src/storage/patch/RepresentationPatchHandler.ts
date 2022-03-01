import type { Term } from 'n3';
import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { BadRequestHttpError } from '../../util/errors/BadRequestHttpError';
import { ConflictHttpError } from '../../util/errors/ConflictHttpError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { isContainerIdentifier } from '../../util/PathUtil';
import { cloneRepresentation } from '../../util/ResourceUtil';
import { readableToQuads } from '../../util/StreamUtil';
import { LDP, PIM, RDF } from '../../util/Vocabularies';
import { RdfToQuadConverter } from '../conversion/RdfToQuadConverter';
import type { PatchHandlerInput } from './PatchHandler';
import { PatchHandler } from './PatchHandler';
import type { RepresentationPatcher } from './RepresentationPatcher';

/**
 * Handles a patch operation by getting the representation from the store, applying a `RepresentationPatcher`,
 * and then writing the result back to the store.
 *
 * In case there is no original representation (the store throws a `NotFoundHttpError`),
 * the patcher is expected to create a new one.
 */
export class RepresentationPatchHandler extends PatchHandler {
  protected readonly logger = getLoggerFor(this);

  private readonly patcher: RepresentationPatcher;

  public constructor(patcher: RepresentationPatcher) {
    super();
    this.patcher = patcher;
  }

  public async handle({ source, patch, identifier }: PatchHandlerInput): Promise<ResourceIdentifier[]> {
    // Get the representation from the store
    let representation: Representation | undefined;
    try {
      representation = await source.getRepresentation(identifier, {});
    } catch (error: unknown) {
      // Solid, §5.1: "When a successful PUT or PATCH request creates a resource,
      // the server MUST use the effective request URI to assign the URI to that resource."
      // https://solid.github.io/specification/protocol#resource-type-heuristics
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
      this.logger.debug(`Patching new resource ${identifier.path}`);
    }
    // Converter of RDF text to N3 store
    const converter = new RdfToQuadConverter();
    let clonedRepresentation;
    if (representation) {
      clonedRepresentation = await cloneRepresentation(representation);
    }
    // Patch it
    const patched = await this.patcher.handleSafe({ patch, identifier, representation });

    // Solid, §5.3: "Servers MUST NOT allow HTTP POST, PUT and PATCH to update a container’s resource metadata
    // statements; if the server receives such a request, it MUST respond with a 409 status code.
    // https://solid.github.io/specification/protocol#contained-resource-metadata-statements
    if (isContainerIdentifier(identifier)) {
      throw new ConflictHttpError('Not allowed to execute PATCH request on containers.');
    }

    if (identifier.path.endsWith('.meta')) {
      // Convert RDF representation to N3
      const patchedClone = await cloneRepresentation(patched);
      const patchedRepresentationQuads = await converter.handleSafe({
        identifier,
        representation: patchedClone,
        preferences: { type: { [INTERNAL_QUADS]: 1 }},
      });
      const patchedStore = await readableToQuads(patchedRepresentationQuads.data);

      if (clonedRepresentation) {
        const representationQuads = await converter.handleSafe({
          identifier,
          representation: clonedRepresentation,
          preferences: { type: { [INTERNAL_QUADS]: 1 }},
        });
        const representationStore = await readableToQuads(representationQuads.data);
        // Test whether pim has been altered
        const pimStorageIds = representationStore.getSubjects(RDF.type, PIM.Storage, null)
          .map((subject: Term): string => subject.id);
        const pimStoragePatchedIds = patchedStore.getSubjects(RDF.type, PIM.Storage, null)
          .map((subject: Term): string => subject.id);

        let pimStorageNotChanged = true;
        pimStorageNotChanged = pimStorageNotChanged && pimStorageIds.length === pimStoragePatchedIds.length;
        for (const pimStorageId of pimStorageIds) {
          pimStorageNotChanged = pimStoragePatchedIds.includes(pimStorageId) ? pimStorageNotChanged : false;
        }
        if (!pimStorageNotChanged) {
          throw new BadRequestHttpError('Not allowed to change metadata that contains PIM storage.');
        }
      } else if (patchedStore.countQuads(null, RDF.type, PIM.Storage, null) !== 0) {
        // In patched, now pim or ldp:contains may be present and that is not allowed
        throw new BadRequestHttpError('Not allowed to change metadata that contains PIM Storage.');
      }
      // Test whether ldp:contains was added in the metadata
      // (remember that ldp:contains is normally build based on resources present in the store,
      // thus it has to be checked when the source existed already or not)
      const ldpContainsPresent = patchedStore.countQuads(null, LDP.contains, null, null) === 0;
      if (!ldpContainsPresent) {
        throw new BadRequestHttpError('Not allowed to change metadata that contains LDP contains.');
      }
    }
    // Write it back to the store
    return source.setRepresentation(identifier, patched);
  }
}
