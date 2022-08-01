import type { Logger } from '../../../../src/logging/Logger';
import { getLoggerFor } from '../../../../src/logging/LogUtil';
import { addGeneratedResources } from '../../../../src/pods/generate/GenerateUtil';
import type { Resource, ResourcesGenerator } from '../../../../src/pods/generate/ResourcesGenerator';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { ConflictHttpError } from '../../../../src/util/errors/ConflictHttpError';

jest.mock('../../../../src/logging/LogUtil', (): any => {
  const logger: Logger = { warn: jest.fn(), debug: jest.fn(), info: jest.fn() } as any;
  return { getLoggerFor: (): Logger => logger };
});
describe('A GenerateUtil', (): void => {
  let logger: jest.Mocked<Logger>;
  let store: jest.Mocked<ResourceStore>;
  let generator: jest.Mocked<ResourcesGenerator>;
  let generatorData: Resource[];

  beforeEach(async(): Promise<void> => {
    store = {
      setRepresentation: jest.fn(),
    } as any;
    generatorData = [
      { identifier: { path: '/container/' }, representation: '/container/' as any },
    ];
    generator = {
      generate: jest.fn(async function* (): any {
        yield* generatorData;
      }),
    } as any;
    logger = getLoggerFor('addGeneratedResources') as any;
  });

  it('logs warnings if there was a problem creating a resource.', async(): Promise<void> => {
    store.setRepresentation.mockRejectedValueOnce(new Error('error'));

    await expect(addGeneratedResources({ path: '/container/' }, {}, generator, store)).resolves.toBe(0);
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenLastCalledWith('Failed to create resource /container/: error');
  });

  it('does not log warnings if the problem was existing containers.', async(): Promise<void> => {
    store.setRepresentation.mockRejectedValueOnce(
      new ConflictHttpError('Existing containers cannot be updated via PUT.'),
    );

    await expect(addGeneratedResources({ path: '/container/' }, {}, generator, store)).resolves.toBe(0);
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
  });
});
