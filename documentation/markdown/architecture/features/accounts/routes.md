# Account API routes

All entries contained in the `urn:solid-server:default:InteractionRouteHandler` have a similar structure:
an `InteractionRouteHandler`, or `AuthorizedRouteHandler` for authenticated requests,
which checks if the request targets a specific URL
and redirects the request to its source if there is a match.
Its source is quite often a `ViewInteractionHandler`,
which returns a specific view on GET requests and performs an operation on POST requests,
but other handlers can also occur.

Below we will give an example of one API route and all the components that are necessary to add it to the server.

## Route handler

```json
{
  "@id": "urn:solid-server:default:AccountWebIdRouter",
  "@type": "AuthorizedRouteHandler",
  "route": {
    "@id": "urn:solid-server:default:AccountWebIdRoute",
    "@type": "RelativePathInteractionRoute",
    "base": { "@id": "urn:solid-server:default:AccountIdRoute" },
    "relativePath": "webid/"
  },
  "source": { "@id": "urn:solid-server:default:WebIdHandler" }
}
```

The main entry point is the route handler,
which determines the URL necessary to reach this API.
In this case we create a new route, relative to the `urn:solid-server:default:AccountIdRoute`.
That route specifically matches URLs of the format `http://localhost:3000/.account/account/<accountId>/`.
Here we create a route relative to that one by appending `webid`,
so the resulting route would match `http://localhost:3000/.account/account/<accountId>/webid/`.
Since an `AuthorizedRouteHandler` is used here,
the request also needs to be authenticated using an account cookie.
If there is match, the request will be sent to the `urn:solid-server:default:WebIdHandler`.

## Interaction handler

```json
{
  "@id": "urn:solid-server:default:WebIdHandler",
  "@type": "ViewInteractionHandler",
  "source": {
    "@id": "urn:solid-server:default:LinkWebIdHandler",
    "@type": "LinkWebIdHandler",
    "baseUrl": { "@id": "urn:solid-server:default:variable:baseUrl" },
    "ownershipValidator": { "@id": "urn:solid-server:default:OwnershipValidator" },
    "accountStore": { "@id": "urn:solid-server:default:AccountStore" },
    "webIdStore": { "@id": "urn:solid-server:default:WebIdStore" },
    "identifierStrategy": { "@id": "urn:solid-server:default:IdentifierStrategy" }
  }
}
```

The interaction handler is the class that performs the necessary operation based on the request.
Often these are wrapped in a `ViewInteractionHandler`,
which allows classes to have different support for GET and POST requests.

## Exposing the API

```json
{
  "@id": "urn:solid-server:default:InteractionRouteHandler",
  "@type": "WaterfallHandler",
  "handlers": [
    { "@id": "urn:solid-server:default:AccountWebIdRouter" }
  ]
}
```

To make sure the API can be accessed,
it needs to be added to the list of `urn:solid-server:default:InteractionRouteHandler`.
This is the main handler that contains entries for all the APIs.
This block of Components.js adds the route handler defined above to that list.

## Adding the necessary controls

```json
{
  "@id": "urn:solid-server:default:AccountControlHandler",
  "@type": "ControlHandler",
  "controls": [{
    "ControlHandler:_controls_key": "webId",
    "ControlHandler:_controls_value": { "@id": "urn:solid-server:default:AccountWebIdRoute" }
  }]
}
```

To make sure people can find the API,
it is necessary to link it through the associated `controls` object.
This API is related to account management,
so we add its route in the account controls with the key `webId`.
More information about controls can be found [here](controls.md).

## Adding HTML

```json
{
  "@id": "urn:solid-server:default:HtmlViewHandler",
  "@type": "HtmlViewHandler",
  "templates": [{
    "@id": "urn:solid-server:default:LinkWebIdHtml",
    "@type": "HtmlViewEntry",
    "filePath": "@css:templates/identity/account/link-webid.html.ejs",
    "route": { "@id": "urn:solid-server:default:AccountWebIdRoute" }
  }]
}
```

Some API routes also have an associated HTML page,
in which case the page needs to be added to the `urn:solid-server:default:HtmlViewHandler`,
which is what we do here.
Usually you will also want to add HTML controls so the page can be found.

```json
{
  "@id": "urn:solid-server:default:AccountHtmlControlHandler",
  "@type": "ControlHandler",
  "controls": [{
    "ControlHandler:_controls_key": "linkWebId",
    "ControlHandler:_controls_value": { "@id": "urn:solid-server:default:AccountWebIdRoute" }
  }]
}
```
