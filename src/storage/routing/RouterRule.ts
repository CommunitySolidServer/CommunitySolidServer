import { AsyncHandler } from 'asynchronous-handlers';
import type { Representation } from '../../http/representation/Representation';
import type { ResourceIdentifier } from '../../http/representation/ResourceIdentifier';
import type { ResourceStore } from '../ResourceStore';

/**
 * Finds which store needs to be accessed for the given resource,
 * potentially based on the Representation of incoming data.
 */
export abstract class RouterRule
  extends AsyncHandler<{ identifier: ResourceIdentifier; representation?: Representation }, ResourceStore> {}
