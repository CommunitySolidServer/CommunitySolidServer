/**
 * This class holds all configuration options that can be defined by the user via the command line.
 *
 * Concretely, this contains data that is only relevant *after* dependency injection.
 */
export class RuntimeConfig implements RuntimeConfigData {
  private pport!: number;
  private pbase!: string;

  public constructor(data: RuntimeConfigData = {}) {
    this.reset(data);
  }

  public reset(data: RuntimeConfigData): void {
    this.pport = data.port ?? 3000;
    this.pbase = data.base ?? `http://localhost:${this.port}/`;
  }

  public get base(): string {
    return this.pbase;
  }

  public get port(): number {
    return this.pport;
  }
}

export interface RuntimeConfigData {
  port?: number;
  base?: string;
}
