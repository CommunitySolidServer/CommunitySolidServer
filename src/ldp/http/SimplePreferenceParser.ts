import { HttpRequest } from '../../server/HttpRequest';
import { PreferenceParser } from './PreferenceParser';
import { RepresentationPreference } from '../representation/RepresentationPreference';
import { RepresentationPreferences } from '../representation/RepresentationPreferences';

export class SimplePreferenceParser extends PreferenceParser {
  public constructor() {
    super();
  }

  public async canHandle(): Promise<void> {
    return undefined;
  }

  public async handle(input: HttpRequest): Promise<RepresentationPreferences> {
    const type = this.parseHeader(input.headers.accept);
    const charset = this.parseHeader(input.headers['accept-charset'] as string);
    const language = this.parseHeader(input.headers['accept-language']);

    // Datetime can have commas so requires separate rules
    let datetime;
    if (input.headers['accept-datetime']) {
      datetime = [{ value: input.headers['accept-datetime'] as string }];
    }

    return { type, charset, datetime, language };
  }

  private parseHeader(header: string): RepresentationPreference[] {
    if (!header) {
      return undefined;
    }

    return header.split(',').map((preference): RepresentationPreference => {
      const parts = preference.split(';');
      if (parts.length === 1) {
        return { value: parts[0].trim() };
      }
      return { value: parts[0].trim(), weight: parseFloat(parts[1].trim().slice('q='.length)) };
    });
  }
}
