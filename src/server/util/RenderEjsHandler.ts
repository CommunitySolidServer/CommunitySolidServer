import type { HttpResponse } from '../HttpResponse';
import { RenderHandler } from './RenderHandler';

export class RenderEjsHandler<
  T extends { viewName: string }
> extends RenderHandler<T> {
  private readonly ejsTemplates: Record<string, string>;

  public constructor(ejsTemplates: Record<string, string>) {
    super();
    this.ejsTemplates = ejsTemplates;
  }

  public async handle(input: { response: HttpResponse; props: T }): Promise<void> {
    // Complete
  }
}
