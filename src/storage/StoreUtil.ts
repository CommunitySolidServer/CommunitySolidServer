import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../storage/ResourceStore';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';

export async function containsResource(store: ResourceStore, identifier: ResourceIdentifier): Promise<boolean> {
  try {
    const result = await store.getRepresentation(identifier, {});
    result.data.destroy();
    return true;
  } catch (error: unknown) {
    if (error instanceof NotFoundHttpError) {
      return false;
    }
    throw error;
  }
}
