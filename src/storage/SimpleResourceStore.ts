import arrayifyStream from 'arrayify-stream';
import { BinaryRepresentation } from '../ldp/representation/BinaryRepresentation';
import { ensureTrailingSlash } from '../util/Util';
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

/**
 * Resource store storing its data as Quads in an in-memory map.
 * All requests will throw an {@link NotFoundHttpError} if unknown identifiers get passed.
 */
export class SimpleResourceStore implements ResourceStore {
  private readonly store: { [id: string]: Quad[] } = { '': []};
  private readonly base: string;
  private index = 0;

  /**
   * @param base - Will be stripped of all incoming URIs and added to all outgoing ones to find the relative path.
   */
  public constructor(base: string) {
    this.base = base;
  }

  /**
   * Stores the incoming data under a new URL corresponding to `container.path + number`.
   * Slash added when needed.
   * @param container - The identifier to store the new data under.
   * @param representation - Data to store. Only Quad streams are supported.
   *
   * @returns The newly generated identifier.
   */
  public async addResource(container: ResourceIdentifier, representation: Representation): Promise<ResourceIdentifier> {
    const containerPath = this.parseIdentifier(container);
    const newPath = `${ensureTrailingSlash(containerPath)}${this.index}`;
    this.index += 1;
    this.store[newPath] = await this.parseRepresentation(representation);
    return { path: `${this.base}${newPath}` };
  }

  /**
   * Deletes the given resource.
   * @param identifier - Identifier of resource to delete.
   */
  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    const path = this.parseIdentifier(identifier);
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.store[path];
  }

  /**
   * Returns the stored representation for the given identifier.
   * The only preference that is supported is `type === 'text/turtle'`.
   * In all other cases a stream of Quads will be returned.
   *
   * @param identifier - Identifier to retrieve.
   * @param preferences - Preferences for resulting Representation.
   *
   * @returns The corresponding Representation.
   */
  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences): Promise<Representation> {
    const path = this.parseIdentifier(identifier);
    return this.generateRepresentation(this.store[path], preferences);
  }

  /**
   * @throws Not supported.
   */
  public async modifyResource(): Promise<void> {
    throw new Error('Not supported.');
  }

  /**
   * Replaces the stored Representation with the new one for the given identifier.
   * @param identifier - Identifier to replace.
   * @param representation - New Representation.
   */
  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    const path = this.parseIdentifier(identifier);
    this.store[path] = await this.parseRepresentation(representation);
  }

  /**
   * Strips the base from the identifier and checks if it is in the store.
   * @param identifier - Incoming identifier.
   *
   * @throws {@link NotFoundHttpError}
   * If the identifier is not in the store.
   *
   * @returns A string representing the relative path.
   */
  private parseIdentifier(identifier: ResourceIdentifier): string {
    const path = identifier.path.slice(this.base.length);
    if (!this.store[path] || !identifier.path.startsWith(this.base)) {
      throw new NotFoundHttpError();
    }
    return path;
  }

  /**
   * Converts the Representation to an array of Quads.
   * @param representation - Incoming Representation.
   * @throws {@link UnsupportedMediaTypeHttpError}
   * If the representation is not a Quad stream.
   *
   * @returns Promise of array of Quads pulled from the stream.
   */
  private async parseRepresentation(representation: Representation): Promise<Quad[]> {
    if (representation.dataType !== 'quad') {
      throw new UnsupportedMediaTypeHttpError('SimpleResourceStore only supports quad representations.');
    }
    return arrayifyStream(representation.data);
  }

  /**
   * Converts an array of Quads to a Representation.
   * If preferences.type contains 'text/turtle' the result will be a stream of turtle strings,
   * otherwise a stream of Quads.
   * @param data - Quads to transform.
   * @param preferences - Requested preferences.
   *
   * @returns The resulting Representation.
   */
  private generateRepresentation(data: Quad[], preferences: RepresentationPreferences): Representation {
    if (preferences.type && preferences.type.some((preference): boolean => preference.value.includes('text/turtle'))) {
      return this.generateBinaryRepresentation(data);
    }
    return this.generateQuadRepresentation(data);
  }

  /**
   * Creates a {@link BinaryRepresentation} of the incoming Quads.
   * @param data - Quads to transform to text/turtle.
   *
   * @returns The resulting binary Representation.
   */
  private generateBinaryRepresentation(data: Quad[]): BinaryRepresentation {
    return {
      dataType: 'binary',
      data: streamifyArray([ ...data ]).pipe(new StreamWriter({ format: 'text/turtle' })),
      metadata: { raw: [], profiles: [], contentType: 'text/turtle' },
    };
  }

  /**
   * Creates a {@link QuadRepresentation} of the incoming Quads.
   * @param data - Quads to transform to a stream of Quads.
   *
   * @returns The resulting quad Representation.
   */
  private generateQuadRepresentation(data: Quad[]): QuadRepresentation {
    return {
      dataType: 'quad',
      data: streamifyArray([ ...data ]),
      metadata: { raw: [], profiles: []},
    };
  }
}
