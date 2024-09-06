# HTTP

Options related to the base support of HTTP requests by the server.

## Handler

Sets up all the handlers a request will potentially pass through.

* *default*: The full setup, that is middleware + static files + IDP + LDP.
* *simple*: A simpler setup in which the IDP is disabled.

## Middleware

A set of handlers that will always be run on all requests to add some metadata
and then pass the request along.

* *default*: The default setup with several handlers.

## Notifications

Determines how notifications should be sent out from the server when resources change.

* *all*: Supports all available notification types of the Solid Notifications protocol
  [specification](https://solidproject.org/TR/notifications-protocol).
  Currently, this includes WebhookChannel2023, WebSocketChannel2023 and StreamingHTTPChannel2023.
* *disabled*: No notifications are sent out.
* *legacy-websocket*: Follows the legacy Solid WebSocket
  [specification](https://github.com/solid/solid-spec/blob/master/api-websockets.md).
  Will be removed in future versions.
* *new-old-websockets.json*: Support for both the legacy Solid Websockets and the new WebSocketChannel2023.
* *streaming-http*: Follows the StreamingHTTPChannel2023
  [specification](https://solid.github.io/notifications/streaming-http-channel-2023) draft.
* *webhooks*: Follows the WebhookChannel2023
  [specification](https://solid.github.io/notifications/webhook-channel-2023) draft.
* *websockets*: Follows the WebSocketChannel2023
  [specification](https://solid.github.io/notifications/websocket-channel-2023).

## Server-Factory

The factory used to create the actual server object.

* *http*: A HTTP server.
* *https*: A HTTPS server.
* *https-no-cli-example*: An example of how to set up an HTTPS server
  by defining the key/cert paths directly in the config itself.

## Static

Support for static files that should be found at a specific path.

* *default*: The default handler with a favicon and css for the IDP.
  New entries can easily be added for new files.
