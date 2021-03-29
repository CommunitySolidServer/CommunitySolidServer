/**
 * Renders given options
 */
export interface TemplateRenderer<T> {
  render: (options: T) => Promise<string>;
}
