export abstract class TemplateRenderer<T> {
  abstract render(options: T): Promise<string>;
}
