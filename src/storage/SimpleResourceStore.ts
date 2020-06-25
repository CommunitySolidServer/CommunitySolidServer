import arrayifyStream from 'arrayify-stream';
import { BinaryRepresentation } from '../ldp/representation/BinaryRepresentation';
import { NotFoundHttpError } from '../util/errors/NotFoundHttpError';
import { Quad } from 'rdf-js';
import { QuadRepresentation } from '../ldp/representation/QuadRepresentation';
import { Representation } from '../ldp/representation/Representation';
import { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { ResourceStore } from './ResourceStore';
import streamifyArray from 'streamify-array';
import { StreamWriter } from 'n3';
import { UnsupportedMediaTypeHttpError } from '../util/errors/UnsupportedMediaTypeHttpError';

export class SimpleResourceStore implements ResourceStore {
  private readonly store: { [id: string]: Quad[] } = { '': []};
  private readonly base: string;
  private index = 0;

  public constructor(base: string) {
    this.base = base;
  }

  public async addResource(container: ResourceIdentifier, representation: Representation): Promise<ResourceIdentifier> {
    const containerPath = this.parseIdentifier(container);
    const newPath = `${containerPath}/${this.index}`;
    this.index += 1;
    this.store[newPath] = await this.parseRepresentation(representation);
    return { path: `${this.base}${newPath}` };
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const path = this.parseIdentifier(identifier);
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.store[path];
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences): Promise<Representation> {
    const path = this.parseIdentifier(identifier);
    return this.generateRepresentation(this.store[path], preferences);
  }

  public async modifyResource(): Promise<void> {
    throw new Error('Not supported.');
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    const path = this.parseIdentifier(identifier);
    this.store[path] = await this.parseRepresentation(representation);
  }

  private parseIdentifier(identifier: ResourceIdentifier): string {
    const path = identifier.path.slice(this.base.length);
    if (!this.store[path] || !identifier.path.startsWith(this.base)) {
      throw new NotFoundHttpError();
    }
    return path;
  }

  private async parseRepresentation(representation: Representation): Promise<Quad[]> {
    if (representation.dataType !== 'quad') {
      throw new UnsupportedMediaTypeHttpError('SimpleResourceStore only supports quad representations.');
    }
    return arrayifyStream(representation.data);
  }

  private generateRepresentation(data: Quad[], preferences: RepresentationPreferences): Representation {
    if (preferences.type && preferences.type.some((preference): boolean => preference.value.includes('text/turtle'))) {
      return this.generateBinaryRepresentation(data);
    }
    return this.generateQuadRepresentation(data);
  }

  private generateBinaryRepresentation(data: Quad[]): BinaryRepresentation {
    return {
      dataType: 'binary',
      data: streamifyArray(data).pipe(new StreamWriter({ format: 'text/turtle' })),
      metadata: { raw: [], profiles: [], contentType: 'text/turtle' },
    };
  }

  private generateQuadRepresentation(data: Quad[]): QuadRepresentation {
    return {
      dataType: 'quad',
      data: streamifyArray(data),
      metadata: { raw: [], profiles: []},
    };
  }
}
