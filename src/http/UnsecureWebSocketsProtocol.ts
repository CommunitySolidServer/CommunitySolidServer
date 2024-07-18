import type { IncomingMessage } from 'node:http';
import type { TLSSocket } from 'node:tls';
import type { WebSocket } from 'ws';
import type { SingleThreaded } from '../init/cluster/SingleThreaded';
import { getLoggerFor } from '../logging/LogUtil';
import type { ActivityEmitter } from '../server/notifications/ActivityEmitter';
import type { WebSocketHandlerInput } from '../server/WebSocketHandler';
import { WebSocketHandler } from '../server/WebSocketHandler';
import { createErrorMessage } from '../util/errors/ErrorUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { GenericEventEmitter } from '../util/GenericEventEmitter';
import { createGenericEventEmitterClass } from '../util/GenericEventEmitter';
import { parseForwarded } from '../util/HeaderUtil';
import { splitCommaSeparated } from '../util/StringUtil';
import type { ResourceIdentifier } from './representation/ResourceIdentifier';

const VERSION = 'solid-0.1';

// eslint-disable-next-line ts/naming-convention
const WebSocketListenerEmitter = createGenericEventEmitterClass<GenericEventEmitter<'closed', () => void>>();

/**
 * Implementation of Solid WebSockets API Spec solid-0.1
 * at https://github.com/solid/solid-spec/blob/master/api-websockets.md
 */
class WebSocketListener extends WebSocketListenerEmitter {
  private host = '';
  private protocol = '';
  private readonly socket: WebSocket;
  private readonly subscribedPaths = new Set<string>();
  private readonly logger = getLoggerFor(this);

  public constructor(socket: WebSocket) {
    super();
    this.socket = socket;
    socket.addListener('error', (): void => this.stop());
    socket.addListener('close', (): void => this.stop());
    socket.addListener('message', (message: string): void => this.onMessage(message));
  }

  public start({ headers, socket }: IncomingMessage): void {
    // Greet the client
    this.sendMessage('protocol', VERSION);

    // Verify the WebSocket protocol version
    const protocolHeader = headers['sec-websocket-protocol'];
    if (protocolHeader) {
      const supportedProtocols = splitCommaSeparated(protocolHeader);
      if (!supportedProtocols.includes(VERSION)) {
        this.sendMessage('error', `Client does not support protocol ${VERSION}`);
        this.stop();
      }
    } else {
      this.sendMessage('warning', `Missing Sec-WebSocket-Protocol header, expected value '${VERSION}'`);
    }

    // Store the HTTP host and protocol
    const forwarded = parseForwarded(headers);
    this.host = forwarded.host ?? headers.host ?? 'localhost';
    this.protocol = forwarded.proto === 'https' || (socket as TLSSocket).encrypted ? 'https:' : 'http:';
  }

  private stop(): void {
    try {
      this.socket.close();
    } catch {
      // Ignore
    }
    this.subscribedPaths.clear();
    this.socket.removeAllListeners();
    this.emit('closed');
  }

  public onResourceChanged({ path }: ResourceIdentifier): void {
    if (this.subscribedPaths.has(path)) {
      this.sendMessage('pub', path);
    }
  }

  private onMessage(message: string): void {
    // Parse the message
    const match = /^(\w+)\s+(\S.+)$/u.exec(message);
    if (!match) {
      this.sendMessage('warning', `Unrecognized message format: ${message}`);
      return;
    }

    // Process the message
    const [ , type, value ] = match;
    switch (type) {
      case 'sub':
        this.subscribe(value);
        break;
      default:
        this.sendMessage('warning', `Unrecognized message type: ${type}`);
    }
  }

  private subscribe(path: string): void {
    try {
      // Resolve and verify the URL
      const resolved = new URL(path, `${this.protocol}${this.host}`);
      if (resolved.host !== this.host) {
        throw new Error(`Mismatched host: expected ${this.host} but got ${resolved.host}`);
      }
      if (resolved.protocol !== this.protocol) {
        throw new Error(`Mismatched protocol: expected ${this.protocol} but got ${resolved.protocol}`);
      }
      // Subscribe to the URL
      const url = resolved.href;
      this.subscribedPaths.add(url);
      this.sendMessage('ack', url);
      this.logger.debug(`WebSocket subscribed to changes on ${url}`);
    } catch (error: unknown) {
      // Report errors to the socket
      const errorText: string = createErrorMessage(error);
      this.sendMessage('error', errorText);
      this.logger.warn(`WebSocket could not subscribe to ${path}: ${errorText}`);
    }
  }

  private sendMessage(type: string, value: string): void {
    this.socket.send(`${type} ${value}`);
  }
}

/**
 * Provides live update functionality following
 * the Solid WebSockets API Spec solid-0.1.
 *
 * The `baseUrl` parameter should be the same one that is used to advertise with the Updates-Via header.
 */
export class UnsecureWebSocketsProtocol extends WebSocketHandler implements SingleThreaded {
  protected readonly logger = getLoggerFor(this);

  private readonly path: string;
  private readonly listeners = new Set<WebSocketListener>();

  public constructor(source: ActivityEmitter, baseUrl: string) {
    super();

    this.logger.warn('The chosen configuration includes Solid WebSockets API 0.1, which is unauthenticated.');
    this.logger.warn('This component will be removed from default configurations in future versions.');

    this.path = new URL(baseUrl).pathname;

    source.on('changed', (changed: ResourceIdentifier): void => this.onResourceChanged(changed));
  }

  public async canHandle({ upgradeRequest }: WebSocketHandlerInput): Promise<void> {
    if (upgradeRequest.url !== this.path) {
      throw new NotImplementedHttpError(`Only WebSocket requests to ${this.path} are supported.`);
    }
  }

  public async handle({ webSocket, upgradeRequest }: WebSocketHandlerInput): Promise<void> {
    const listener = new WebSocketListener(webSocket);
    this.listeners.add(listener);
    this.logger.info(`New WebSocket added, ${this.listeners.size} in total`);

    listener.on('closed', (): void => {
      this.listeners.delete(listener);
      this.logger.info(`WebSocket closed, ${this.listeners.size} remaining`);
    });
    listener.start(upgradeRequest);
  }

  private onResourceChanged(changed: ResourceIdentifier): void {
    for (const listener of this.listeners) {
      listener.onResourceChanged(changed);
    }
  }
}
