import type { RepresentationMetadata } from '../../http/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { PIM, RDF } from '../../util/Vocabularies';
import type { DataAccessor } from '../accessors/DataAccessor';

/**
 * Finds the closest parent container that has `pim:Storage` as metadata.
 */
export async function discoverPod(
  identifier: ResourceIdentifier,
  accessor: DataAccessor,
  identifierStrategy: IdentifierStrategy,
): Promise<ResourceIdentifier | null> {
  let metadata: RepresentationMetadata;
  try {
    metadata = await accessor.getMetadata(identifier);
  } catch (error: unknown) {
    if (NotFoundHttpError.isInstance(error)) {
      // Resource and/or its metadata do not exist — walk up, but stop at a
      // root container to avoid unbounded recursion.
      if (identifierStrategy.isRootContainer(identifier)) {
        return null;
      }
      return discoverPod(
        identifierStrategy.getParentContainer(identifier),
        accessor,
        identifierStrategy,
      );
    }
    throw error;
  }
  const hasPimStorage = metadata.getAll(RDF.terms.type)
    .some((term): boolean => term.value === PIM.Storage);
  if (hasPimStorage) {
    return identifier;
  }
  if (identifierStrategy.isRootContainer(identifier)) {
    return null;
  }
  return discoverPod(
    identifierStrategy.getParentContainer(identifier),
    accessor,
    identifierStrategy,
  );
}
