# Features

Below is a non-exhaustive listing of the features available to a server instance,
depending on the chosen configuration.
The core feature of the CSS is that it uses **dependency injection** to configure its components,
so any of the features below can always be adapted or replaced with custom components if required.
It can also be used to configure dummy components for debugging, development, or experimentation purposes.
See this [tutorial](https://github.com/CommunitySolidServer/tutorials/blob/main/custom-configurations.md)
and/or this [example repository](https://github.com/CommunitySolidServer/hello-world-component)
for more information on that.

To generate configurations with some of these features enabled/disabled,
you can use the **[configuration generator](https://communitysolidserver.github.io/configuration-generator/)**.

## Authentication

Clients are identified based on the contents of **DPoP** tokens,
as described in the [**Solid-OIDC** specification](https://solidproject.org/TR/oidc).

The server also provides several dummy components that can be used here,
to either always identify the client as a fixed WebID,
or to allow the WebID to be set directly in the `Authorization` header.
These can be configured by changing the `ldp/authentication` import in your configuration.

## Authorization

Two authorization mechanisms are implemented for determining who has access to resources:

* **[Web Access Control](https://solidproject.org/TR/wac)**
* **[Access Control Policy](https://solidproject.org/TR/acp)**

Alternatively, the server can be configured to not have any kind of authorization and allow full access to all resources.

## Solid Protocol

The **[Solid Protocol](https://solidproject.org/TR/protocol)** is supported.

Requests to the server support **content negotiation** for common RDF formats.

Binary **[range headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range)** are supported.

[`ETag`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag) and `Last-Modified` headers are supported.
These can be used for **[conditional requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests)**.

`PATCH` requests targeting RDF resources can be made with **N3 Patch** or **SPARQL Update** bodies.

The server can be configured to store data in **memory**, on the **file system**, or through a **SPARQL endpoint**.
Similarly, the locking system that is used to prevent data conflicts
can be configured to store locks in memory, on the file system, or in a Redis store, or it can be disabled.

Multiple **worker threads** can be used when starting the server.

## Account management

Accounts can be created on the server with which users can perform the following actions,
through either a **JSON** or an **HTML** API:

* Add **email/password** combinations which can be used to log in.
* Create **pods**, which are containers on the server over which the user has full control.
* Link **WebIDs** to the account. When using [Solid-OIDC](https://solidproject.org/TR/oidc),
  the user can identify as any of these.
  For external WebIDs, the server requires the user to add a triple as identification,
  but this can be disabled if needed.
* Create **client credentials**, which can be used to authenticate without using the browser.
  More information on these can be found [here](usage/client-credentials.md).
* It is possible to use Solid-OIDC to limit access to certain parts of the account API.
  More information on this can be found [here](usage/identity-provider.md#access).

Using these accounts, the server can generate tokens
to support **[Solid-OIDC](https://solidproject.org/TR/oidc)** authentication.

### Pods

The server keeps track of the **pod owners**,
which is a list of WebIDs which have full control access over all resources contained within.
Owners can be added to and removed from a pod.

Pod URLs can be minted as either
**subdomain**, `http://pod.example.com/`, or **suffix**, `http://example.com/pod/`.

When starting the server, a configuration file can be provided
to immediately create one or more accounts on the server with their own pods.
See the [documentation](usage/seeding-pods.md) for more information.

## Notifications

CSS supports v0.2.0 of the **[Solid Notifications Protocol](https://solidproject.org/TR/notifications-protocol)**.
Specifically it supports the Notification Types
[WebSocketChannel2023](https://solid.github.io/notifications/websocket-channel-2023)
and [WebhookChannel2023](https://solid.github.io/notifications/webhook-channel-2023).

More documentation on notifications can be found [here](usage/notifications.md).
