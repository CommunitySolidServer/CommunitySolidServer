import type { Representation } from '../../ldp/representation/Representation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import type { ResourceStore } from '../ResourceStore';
import type { RouterRule } from './RouterRule';

// TODO:
export class PathRouterRule implements RouterRule {
  private readonly pathMap: { [path: string]: ResourceStore };

  public constructor(pathMap: { [path: string]: ResourceStore }) {
    this.pathMap = pathMap;
  }

  public async getMatchingResourceStore(identifier: ResourceIdentifier, representation?: Representation):
  Promise<ResourceStore> {
    const paths = Object.keys(this.pathMap);
    const matches = paths.filter((path): boolean => identifier.path.includes(path));
    if (matches.length !== 1) {
      // Incoming data, need to reject
      if (representation) {
        throw new UnsupportedHttpError(
          `Identifiers need to have exactly 1 of the following in them: [${paths.join(', ')}]`,
        );

      // Because of the above requirement, we know this will always be a 404 for requests
      } else {
        throw new NotFoundHttpError();
      }
    }

    return this.pathMap[matches[0]];
  }
}
