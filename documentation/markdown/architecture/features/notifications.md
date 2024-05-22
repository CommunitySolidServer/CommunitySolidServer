# Notifications

This section covers the architecture used to support the Notifications protocol
as described in <https://solidproject.org/TR/2022/notifications-protocol-20221231>.

There are three core architectural components, that have distinct entry points:

* Exposing metadata to allow discovery of the subscription type.
* Handling subscriptions targeting a resource.
* Emitting notifications when there is activity on a resource.

## Discovery

Discovery is done through the storage description resource(s).
The server returns the same triples for every such resource
as the notification subscription URL is always located in the root of the server.

```mermaid
flowchart LR
  StorageDescriptionHandler("<br>StorageDescriptionHandler")
  StorageDescriptionHandler --> StorageDescriber("<strong>StorageDescriber</strong><br>ArrayUnionHandler")
  StorageDescriber --> NotificationDescriber("NotificationDescriber<br>NotificationDescriber")
  NotificationDescriber --> NotificationDescriberArgs

  subgraph NotificationDescriberArgs[" "]
    direction LR
    NotificationChannelType("<br>NotificationChannelType")
    NotificationChannelType2("<br>NotificationChannelType")
  end
```

The server uses a `StorageDescriptionHandler` to generate the necessary RDF data
and to handle content negotiation.
To generate the data we have multiple `StorageDescriber`s,
whose results get merged together in an `ArrayUnionHandler`.

A `NotificationChannelType` contains the specific details of a specification notification channel type,
including a JSON-LD representation of the corresponding subscription resource.
One specific instance of a `StorageDescriber` is a `NotificationDescriber`,
which merges those JSON-LD descriptions into a single set of RDF quads.
When adding a new subscription type,
a new instance of such a class should be added to the `urn:solid-server:default:NotificationDescriber`.

## NotificationChannel

To subscribe, a client has to send a specific JSON-LD request to the URL found during discovery.

```mermaid
flowchart LR
  NotificationTypeHandler("<strong>NotificationTypeHandler</strong><br>WaterfallHandler")
  NotificationTypeHandler --> NotificationTypeHandlerArgs

  subgraph NotificationTypeHandlerArgs[" "]
    direction LR
    OperationRouterHandler("<br>OperationRouterHandler") --> NotificationSubscriber("<br>NotificationSubscriber")
NotificationSubscriber --> NotificationChannelType("<br><i>NotificationChannelType</i>")
    OperationRouterHandler2("<br>OperationRouterHandler") --> NotificationSubscriber2("<br>NotificationSubscriber")
NotificationSubscriber2 --> NotificationChannelType2("<br><i>NotificationChannelType</i>")
  end
```

Every subscription type should have a subscription URL relative to the root notification URL,
which in our configs is set to `/.notifications/`.
For every type there is then a `OperationRouterHandler` that accepts requests to that specific URL,
after which a `NotificationSubscriber` handles all checks related to subscribing,
for which it uses a `NotificationChannelType`.
If the subscription is valid and has authorization, the results will be saved in a `NotificationChannelStorage`.

## Activity

```mermaid
flowchart TB
  ListeningActivityHandler("<strong>ListeningActivityHandler</strong><br>ListeningActivityHandler")
  ListeningActivityHandler --> ListeningActivityHandlerArgs

  subgraph ListeningActivityHandlerArgs[" "]
    NotificationChannelStorage("<strong>NotificationChannelStorage</strong><br><i>NotificationChannelStorage</i>")
    ResourceStore("<strong>ResourceStore</strong><br><i>ActivityEmitter</i>")
    NotificationHandler("<strong>NotificationHandler</strong><br>WaterfallHandler")
  end

  NotificationHandler --> NotificationHandlerArgs
  subgraph NotificationHandlerArgs[" "]
    direction TB
    NotificationHandler1("<br><i>NotificationHandler</i>")
    NotificationHandler2("<br><i>NotificationHandler</i>")
  end
```

An `ActivityEmitter` is a class that emits events every time data changes in the server.
The `MonitoringStore` is an implementation of this in the server.
The `ListeningActivityHandler` is the class that listens to these events
and makes sure relevant notifications get sent out.

It will pull the relevant subscriptions from the storage and call the stored `NotificationHandler` for each of time.
For every subscription type, a `NotificationHandler` should be added to the `WaterfallHandler`
that handles notifications for the specific type.

## WebSocketChannel2023

To add support for [WebSocketChannel2023](https://solid.github.io/notifications/websocket-channel-2023) notifications,
components were added as described in the documentation above.

For discovery, a `NotificationDescriber` was added with the corresponding settings.

As `NotificationChannelType`, there is a specific `WebSocketChannel2023Type` that contains all the necessary information.

### Handling notifications

As `NotificationHandler`, the following architecture is used:

```mermaid
flowchart TB
  TypedNotificationHandler("<br>TypedNotificationHandler")
  TypedNotificationHandler --> ComposedNotificationHandler("<br>ComposedNotificationHandler")
  ComposedNotificationHandler --> ComposedNotificationHandlerArgs

  subgraph ComposedNotificationHandlerArgs[" "]
    direction LR
    BaseNotificationGenerator("<strong>BaseNotificationGenerator</strong><br><i>NotificationGenerator</i>")
    BaseNotificationSerializer("<strong>BaseNotificationSerializer</strong><br><i>NotificationSerializer</i>")
    WebSocket2023Emitter("<strong>WebSocket2023Emitter</strong><br>WebSocket2023Emitter")
    BaseNotificationGenerator --> BaseNotificationSerializer --> WebSocket2023Emitter
  end
```

A `TypedNotificationHandler` is a handler that can be used to filter out subscriptions for a specific type,
making sure only WebSocketChannel2023 subscriptions will be handled.

A `ComposedNotificationHandler` combines 3 interfaces to handle the notifications:

* A `NotificationGenerator` converts the information into a Notification object.
* A `NotificationSerializer` converts a Notification object into a serialized Representation.
* A `NotificationEmitter` takes a Representation and sends it out in a way specific to that subscription type.

`urn:solid-server:default:BaseNotificationGenerator` is a generator that fills in the default Notification template,
and also caches the result so it can be reused by multiple subscriptions.

`urn:solid-server:default:BaseNotificationSerializer` converts the Notification to a JSON-LD representation
and handles any necessary content negotiation based on the `accept` notification feature.

A `WebSocket2023Emitter` is a specific emitter that checks
whether the current open WebSockets correspond to the subscription.

### WebSockets

```mermaid
flowchart TB
  WebSocket2023Listener("<strong>WebSocket2023Listener</strong><br>WebSocket2023Listener")
  WebSocket2023Listener --> WebSocket2023ListenerArgs

  subgraph WebSocket2023ListenerArgs[" "]
    direction LR
    NotificationChannelStorage("<strong>NotificationChannelStorage</strong><br>NotificationChannelStorage")
    SequenceHandler("<br>SequenceHandler")
  end

  SequenceHandler --> SequenceHandlerArgs

  subgraph SequenceHandlerArgs[" "]
    direction TB
    WebSocket2023Storer("<strong>WebSocket2023Storer</strong><br>WebSocket2023Storer")
    WebSocket2023StateHandler("<strong>WebSocket2023StateHandler</strong><br>BaseStateHandler")
  end
```

To detect and store WebSocket connections, the `WebSocket2023Listener` is added as a listener to the HTTP server.
For all WebSocket connections that get opened, it verifies whether they correspond to an existing subscription.
If yes, the information gets sent out to its stored `WebSocket2023Handler`.

In this case, this is a `SequenceHandler`, which contains a `WebSocket2023Storer` and a `BaseStateHandler`.
The `WebSocket2023Storer` will store the WebSocket in the same map used by the `WebSocket2023Emitter`,
so that class can emit events later on, as mentioned above.
The state handler will make sure that a notification gets sent out if the subscription has a `state` feature request,
as defined in the notification specification.

## WebhookChannel2023

The additions required to support
[WebhookChannel2023](https://solid.github.io/notifications/webhook-channel-2023)
are quite similar to those needed for WebSocketChannel2023:

* For discovery, there is a `WebhookDescriber`, which is an extension of a `NotificationDescriber`.
* The `WebhookChannel2023Type` class contains all the necessary typing information.
* `WebhookEmitter` is the `NotificationEmitter` that sends the request.
* `WebhookUnsubscriber` and `WebhookWebId` are additional utility classes to support the spec requirements.

## StreamingHTTPChannel2023

Currently, support for [StreamingHTTPChannel2023](https://solid.github.io/notifications/streaming-http-channel-2023)
only covers default, pre-established channels made available for every resource. Those channels output `text/turtle`.

Support for custom, subscription-based channels can be added in the future.

* For discovery, there is a `StreamingHttpMetadataWriter`, which adds `Link` to every `HTTP` response header
using `rel="http://www.w3.org/ns/solid/terms#updatesViaStreamingHttp2023"`. It links directly to the `receiveFrom`
endpoint of the default, pre-established channel for that topic resource.
* Requests to `receiveFrom` endpoints are handled by a `StreamingHttpRequestHandler`.
    * It performs an authorization check.
    * It creates a new response stream and adds it to the `StreamingHttpMap`, indexed by the topic resource.
    * It sends an initial notification, similar to notification channels using a `state` feature.
* `StreamingHttp2023Emitter` is the `NotificationEmitter` that writes notifications to matching response streams.
* `StreamingHttpListeningActivityHandler` is responsible for observing the `MonitoringStore`
  and emitting notifications when needed.
  It doesn't use a `NotificationChannelStorage` since the default, pre-established channels are not
  subscription-based. Instead, it uses a `StreamingHttpMap` to check for active receivers.

```mermaid
flowchart TB
  StreamingHttpListeningActivityHandler("<strong>StreamingHttpListeningActivityHandler</strong><br>StreamingHttpListeningActivityHandler")
  StreamingHttpListeningActivityHandler --> StreamingHttpListeningActivityHandlerArgs

  subgraph StreamingHttpListeningActivityHandlerArgs[" "]
    StreamingHttpMap("<strong>StreamingHttpMap</strong><br><i>StreamingHttpMap</i>")
    ResourceStore("<strong>ResourceStore</strong><br><i>ActivityEmitter</i>")
    StreamingHttpNotificationHandler("<strong>StreamingHttpNotificationHandler</strong><br><i>ComposedNotificationHandler</i>")
  end

   StreamingHttpNotificationHandler --> StreamingHttpNotificationHandlerArgs
  subgraph StreamingHttpNotificationHandlerArgs[" "]
    direction TB
    Generator("<strong>BaseNotificationGenerator</strong>")
    Serializer("<strong>BaseNotificationSerializer</strong>")
    Emitter("<strong>StreamingHttp2023Emitter</strong><br><i>StreamingHttp2023Emitter</i>")
    ETagHandler("<strong>ETagHandler</strong>")

  end
```
