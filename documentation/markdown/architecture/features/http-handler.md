# Handling HTTP requests

The direction of the arrows was changed slightly here to make the graph readable.

```mermaid
flowchart LR
  HttpHandler("<strong>HttpHandler</strong><br>SequenceHandler")
  HttpHandler --> HttpHandlerArgs

  subgraph HttpHandlerArgs[" "]
    direction LR
    Middleware("<strong>Middleware</strong><br><i>HttpHandler</i>")
    WaterfallHandler("<br>WaterfallHandler")
  end

  Middleware --> WaterfallHandler
  WaterfallHandler --> WaterfallHandlerArgs

  subgraph WaterfallHandlerArgs[" "]
    direction TB
    StaticAssetHandler("<strong>StaticAssetHandler</strong><br>StaticAssetHandler")
    SetupHandler("<strong>SetupHandler</strong><br><i>HttpHandler</i>")
    OidcHandler("<strong>OidcHandler</strong><br><i>HttpHandler</i>")
    AuthResourceHttpHandler("<strong>AuthResourceHttpHandler</strong><br><i>HttpHandler</i>")
    IdentityProviderHttpHandler("<strong>IdentityProviderHttpHandler</strong><br><i>HttpHandler</i>")
    LdpHandler("<strong>LdpHandler</strong><br><i>HttpHandler</i>")
  end

  StaticAssetHandler --> SetupHandler
  SetupHandler --> OidcHandler
  OidcHandler --> AuthResourceHttpHandler
  AuthResourceHttpHandler --> IdentityProviderHttpHandler
  IdentityProviderHttpHandler --> LdpHandler
```

The `HttpHandler` is responsible for handling an incoming HTTP request.
The request will always first go through the `Middleware`,
where certain required headers will be added such as CORS headers.

After that it will go through the list in the `WaterfallHandler`
to find the first handler that understands the request,
with the `LdpHandler` at the bottom being the catch-all default.

## StaticAssetHandler

The `urn:solid-server:default:StaticAssetHandler` matches exact URLs to static assets which require no further logic.
An example of this is the favicon, where the `/favicon.ico` URL
is directed to the favicon file at `/templates/images/favicon.ico`.
It can also map entire folders to a specific path, such as `/.well-known/css/styles/` which contains all stylesheets.

## SetupHandler

The `urn:solid-server:default:SetupHandler` is responsible
for redirecting all requests to `/setup` until setup is finished,
thereby ensuring that setup needs to be finished before anything else can be done on the server,
and handling the actual setup request that is sent to `/setup`.
Once setup is finished, this handler will reject all requests and thus no longer be relevant.

If the server is configured to not have setup enabled,
the corresponding identifier will point to a handler that always rejects all requests.

## OidcHandler

The `urn:solid-server:default:OidcHandler` handles all requests related
to the Solid-OIDC [specification](https://solid.github.io/solid-oidc/).
The OIDC component is configured to work on the `/.oidc/` subpath,
so this handler catches all those requests and sends them to the internal OIDC library that is used.

## AuthResourceHttpHandler

The `urn:solid-server:default:AuthResourceHttpHandler` is identical
to the `urn:solid-server:default:LdpHandler` which will be discussed below,
but only handles resources relevant for authorization.

In practice this means that is your server is configured
to use [Web Access Control](https://solidproject.org/TR/wac) for authorization,
this handler will catch all requests targeting `.acl` resources.

The reason these already need to be handled here is so these can also be used
to allow authorization on the following handler(s).
More on this can be found in the [identity provider](../../../usage/identity-provider/#access) documentation

## IdentityProviderHttpHandler

The `urn:solid-server:default:IdentityProviderHttpHandler` handles everything
related to our custom identity provider API, such as registering, logging in, returning the relevant HTML pages, etc.
All these requests are identified by being on the `/idp/` subpath.
More information on the API can be found in the [identity provider](../../../usage/identity-provider) documentation

## LdpHandler

Once a request reaches the `urn:solid-server:default:LdpHandler`,
the server assumes this is a standard Solid request according to the Solid protocol.
A detailed description of what happens then can be found [here](protocol/overview.md)
