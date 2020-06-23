import { Credentials } from './Credentials';
import { CredentialsExtractor } from './CredentialsExtractor';
import { HttpRequest } from '../server/HttpRequest';

export class SimpleCredentialsExtractor extends CredentialsExtractor {
  public async canHandle(): Promise<void> {
    return undefined;
  }

  public async handle(input: HttpRequest): Promise<Credentials> {
    if (input.headers.authorization) {
      return { webID: input.headers.authorization };
    }
    return undefined;
  }
}
