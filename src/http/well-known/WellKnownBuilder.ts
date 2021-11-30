/**
 * Handles building the .well-known/solid file. Each feature from around the codebase
 * that need to contribute to the .well-known/solid file should have a WellKnownBuilder
 * and register it with the BaseWellKnownBuilder. When the .well-known/solid file is
 * requested, each WellKnownBuilder will contribute its segment of the file.
 */
export interface WellKnownBuilder {
  /**
   * Returns a segment of the .well-known/solid file
   */
  getWellKnownSegment: () => Promise<Record<string, any>>;
}
