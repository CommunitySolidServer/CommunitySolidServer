import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { Representation } from '../../ldp/representation/Representation';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import { isContainerIdentifier } from '../../util/PathUtil';
import { SOLID_META } from '../../util/Vocabularies';
import type { RepresentationPatcherInput } from './RepresentationPatcher';
import { RepresentationPatcher } from './RepresentationPatcher';

/**
 * A `RepresentationPatcher` specifically for patching containers.
 * A new body will be constructed from the metadata by removing all generated metadata.
 * This body will be passed to the wrapped patcher.
 */
export class ContainerPatcher extends RepresentationPatcher {
  private readonly patcher: RepresentationPatcher;

  public constructor(patcher: RepresentationPatcher) {
    super();
    this.patcher = patcher;
  }

  public async canHandle(input: RepresentationPatcherInput): Promise<void> {
    const { identifier, representation } = input;
    if (!isContainerIdentifier(identifier)) {
      throw new NotImplementedHttpError('Only containers are supported.');
    }
    // Verify the patcher can handle a representation containing the metadata
    let containerPlaceholder = representation;
    if (representation) {
      containerPlaceholder = new BasicRepresentation([], representation.metadata, INTERNAL_QUADS);
    }
    await this.patcher.canHandle({ ...input, representation: containerPlaceholder });
  }

  public async handle(input: RepresentationPatcherInput): Promise<Representation> {
    const { identifier, representation } = input;
    if (!representation) {
      return await this.patcher.handle(input);
    }
    // Remove all generated metadata to prevent it from being stored permanently
    representation.metadata.removeQuads(
      representation.metadata.quads(null, null, null, SOLID_META.terms.ResponseMetadata),
    );
    const quads = representation.metadata.quads();

    // We do not copy the original metadata here, otherwise it would put back triples that might be deleted
    const containerRepresentation = new BasicRepresentation(quads, identifier, INTERNAL_QUADS, false);
    return await this.patcher.handle({ ...input, representation: containerRepresentation });
  }
}
