import type { Representation } from '../http/representation/Representation';
import type { ResourceIdentifier } from '../http/representation/ResourceIdentifier';
import { AsyncHandler } from '../util/handlers/AsyncHandler';

export abstract class ShapeValidator extends AsyncHandler<{ parentContainerIdentifier: ResourceIdentifier;
  parentContainerRepresentation: Representation;
  representation: Representation; }> {}
