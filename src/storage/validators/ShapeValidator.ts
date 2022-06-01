import type { Representation } from '../../http/representation/Representation';
import { AsyncHandler } from '../../util/handlers/AsyncHandler';

export type ShapeValidatorInput = {
  parentRepresentation: Representation;
  representation: Representation;
};

export abstract class ShapeValidator extends AsyncHandler<ShapeValidatorInput> {}
