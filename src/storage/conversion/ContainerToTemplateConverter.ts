import type { Readable } from 'node:stream';
import orderBy from 'lodash.orderby';
import type { Quad } from '@rdfjs/types';
import { BasicRepresentation } from '../../http/representation/BasicRepresentation';
import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { isContainerIdentifier, isContainerPath } from '../../util/PathUtil';
import { endOfStream } from '../../util/StreamUtil';
import type { TemplateEngine } from '../../util/templates/TemplateEngine';
import { LDP } from '../../util/Vocabularies';
import { BaseTypedRepresentationConverter } from './BaseTypedRepresentationConverter';
import type { RepresentationConverterArgs } from './RepresentationConverter';

interface ResourceDetails {
  name: string;
  identifier: string;
  container: boolean;
}

/**
 * A {@link RepresentationConverter} that creates a templated representation of a container.
 */
export class ContainerToTemplateConverter extends BaseTypedRepresentationConverter {
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly templateEngine: TemplateEngine;
  private readonly contentType: string;

  public constructor(templateEngine: TemplateEngine, contentType: string, identifierStrategy: IdentifierStrategy) {
    super(INTERNAL_QUADS, contentType);
    this.templateEngine = templateEngine;
    this.contentType = contentType;
    this.identifierStrategy = identifierStrategy;
  }

  public async canHandle(args: RepresentationConverterArgs): Promise<void> {
    if (!isContainerIdentifier(args.identifier)) {
      throw new NotImplementedHttpError('Can only convert containers.');
    }
    await super.canHandle(args);
  }

  public async handle({ identifier, representation }: RepresentationConverterArgs): Promise<Representation> {
    const rendered = await this.templateEngine.handleSafe({ contents: {
      identifier: identifier.path,
      name: this.getLocalName(identifier.path),
      container: true,
      children: await this.getChildResources(identifier, representation.data),
      parents: this.getParentContainers(identifier),
    }});
    return new BasicRepresentation(rendered, representation.metadata, this.contentType);
  }

  /**
   * Collects the children of the container as simple objects.
   */
  private async getChildResources(container: ResourceIdentifier, quads: Readable): Promise<ResourceDetails[]> {
    // Collect the needed bits of information from the containment triples
    const resources = new Set<string>();
    quads.on('data', ({ subject, predicate, object }: Quad): void => {
      if (subject.value === container.path && predicate.equals(LDP.terms.contains)) {
        resources.add(object.value);
      }
    });
    await endOfStream(quads);

    // Create a simplified object for every resource
    const children = [ ...resources ].map((resource: string): ResourceDetails => ({
      identifier: resource,
      name: this.getLocalName(resource),
      container: isContainerPath(resource),
    }));

    // Sort the resulting list
    return orderBy(children, [ 'container', 'identifier' ], [ 'desc', 'asc' ]);
  }

  /**
   * Collects the ancestors of the container as simple objects.
   */
  private getParentContainers(container: ResourceIdentifier): ResourceDetails[] {
    const parents = [];
    let current = container;
    while (!this.identifierStrategy.isRootContainer(current)) {
      current = this.identifierStrategy.getParentContainer(current);
      parents.push({
        identifier: current.path,
        name: this.getLocalName(current.path),
        container: true,
      });
    }
    return parents.reverse();
  }

  /**
   * Derives a short name for the given resource.
   */
  private getLocalName(iri: string): string {
    const match = /:\/+([^/]+)(?:\/[^/]*)*?\/([^/]*)\/?$/u.exec(iri);
    return match?.[2] ? decodeURIComponent(match[2]) : match?.[1] ?? iri;
  }
}
