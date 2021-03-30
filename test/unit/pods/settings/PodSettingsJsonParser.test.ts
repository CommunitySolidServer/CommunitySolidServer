import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import { PodSettingsJsonParser } from '../../../../src/pods/settings/PodSettingsJsonParser';
import { BadRequestHttpError } from '../../../../src/util/errors/BadRequestHttpError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';
import { guardedStreamFrom } from '../../../../src/util/StreamUtil';

describe('An PodSettingsJsonParser', (): void => {
  let metadata: RepresentationMetadata;
  let representation: Representation;
  const parser = new PodSettingsJsonParser();

  beforeEach(async(): Promise<void> => {
    metadata = new RepresentationMetadata('application/json');
    representation = new BasicRepresentation([], metadata);
  });

  it('only supports JSON data.', async(): Promise<void> => {
    metadata.contentType = undefined;
    const result = parser.canHandle(representation);
    await expect(result).rejects.toThrow(NotImplementedHttpError);
    await expect(result).rejects.toThrow('Only JSON data is supported');
    metadata.contentType = 'application/json';
    await expect(parser.canHandle(representation)).resolves.toBeUndefined();
    metadata.contentType = 'application/ld+json';
    await expect(parser.canHandle(representation)).resolves.toBeUndefined();
  });

  it('errors if required keys are missing.', async(): Promise<void> => {
    representation.data = guardedStreamFrom([ JSON.stringify({ login: 'login' }) ]);
    const result = parser.handle(representation);
    await expect(result).rejects.toThrow(BadRequestHttpError);
    await expect(result).rejects.toThrow('Input data is missing key webId');
  });

  it('generates a User object.', async(): Promise<void> => {
    representation.data = guardedStreamFrom([ JSON.stringify({
      login: 'login',
      webId: 'webId',
      name: 'name',
    }) ]);
    await expect(parser.handle(representation)).resolves
      .toEqual({
        login: 'login',
        webId: 'webId',
        name: 'name',
      });
  });
});
