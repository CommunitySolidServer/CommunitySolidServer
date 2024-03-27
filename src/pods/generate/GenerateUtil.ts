import type { ResourceStore } from '../../storage/ResourceStore';
import type { PodSettings } from '../settings/PodSettings';
import type { ResourcesGenerator } from './ResourcesGenerator';

/**
 * Generates resources with the given generator and adds them to the given store.
 *
 * @param settings - Settings from which the pod is being created.
 * @param generator - Generator to be used.
 * @param store - Store to be updated.
 *
 * @returns The amount of resources that were added.
 */
export async function addGeneratedResources(
  settings: PodSettings,
  generator: ResourcesGenerator,
  store: ResourceStore,
): Promise<number> {
  const resources = generator.generate(settings.base, settings);
  let count = 0;
  for await (const { identifier: resourceId, representation } of resources) {
    await store.setRepresentation(resourceId, representation);
    count += 1;
  }
  return count;
}
