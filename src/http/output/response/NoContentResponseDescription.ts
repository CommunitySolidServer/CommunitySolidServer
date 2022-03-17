import { ResponseDescription } from './ResponseDescription';

/**
 * Corresponds to a 204 response.
 */
export class NoContentResponseDescription extends ResponseDescription {
  public constructor() {
    super(204);
  }
}
