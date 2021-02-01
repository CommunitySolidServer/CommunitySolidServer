import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import type { ResourceStore } from './ResourceStore';

export async function containsResource(store: ResourceStore, identifier: ResourceIdentifier): Promise<boolean> {
  try {
    const result = await store.getRepresentation(identifier, {});
    result.data.destroy();
    return true;
  } catch (error: unknown) {
    if (NotFoundHttpError.isInstance(error)) {
      return false;
    }
    throw error;
  }
}
