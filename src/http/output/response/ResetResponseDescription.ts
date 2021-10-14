import { ResponseDescription } from './ResponseDescription';

/**
 * Corresponds to a 205 response.
 */
export class ResetResponseDescription extends ResponseDescription {
  public constructor() {
    super(205);
  }
}
