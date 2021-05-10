# HTTP
Options related to the base support of HTTP requests by the server.

## Handler
Sets up all the handlers a request will potentially pass through.
* *default*: The full setup, that is middleware + static files + pod creation + IDP + LDP.
* *simple*: A simpler setup that only supports the base solid features. Has no pod creation or IDP.

## Middleware
A set of handlers that will always be run on all requests to add some metadata
and then pass the request along.
* *no-websockets*: The default setup but without the websocket-related metadata.
* *websockets*: The default setup with several handlers.

## Server-Factory
The factory used to create the actual server object.
* *no-websockets*: Only HTTP.
* *websockets*: HTTP and websockets.

## Static
Support for static files that should be found at a specific path.
* *default*: The default handler with a favicon and css for the IDP.
  New entries can easily be added for new files.
