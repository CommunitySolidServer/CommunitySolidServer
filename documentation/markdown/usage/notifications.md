# Receiving notifications

A CSS instance can be configured to support
[Solid notifications](https://solidproject.org/TR/2022/notifications-protocol-20221231).
These can be used to track changes on the server.
There are no specific requirements on the type of notifications a Solid server should support,
so on this page we'll describe the notification types supported by CSS,
and how to make use of the different ways supported to receive notifications.

## Discovering subscription services

CSS only supports discovering the notification subscription services through the storage description resource.
This can be found by doing a `HEAD` request on any resource in your pod and looking for the `Link` header
with the `http://www.w3.org/ns/solid/terms#storageDescription` relationship.

For example, when hosting the server on localhost with port 3000, the result is:

```bash
Link: <http://localhost:3000/.well-known/solid>; rel="http://www.w3.org/ns/solid/terms#storageDescription"
```

Doing a GET to `http://localhost:3000/.well-known/solid` then gives the following result (simplified for readability):

```turtle
@prefix notify: <http://www.w3.org/ns/solid/notifications#>.

<http://localhost:3000/.well-known/solid>
    a                   <http://www.w3.org/ns/pim/space#Storage> ;
    notify:subscription <http://localhost:3000/.notifications/WebSocketChannel2023/> ,
                        <http://localhost:3000/.notifications/WebHookSubscription2021/> .
<http://localhost:3000/.notifications/WebSocketChannel2023/>
    notify:channelType  notify:WebSocketChannel2023 ;
    notify:feature      notify:accept ,
                        notify:endAt ,
                        notify:rate ,
                        notify:startAt ,
                        notify:state .
<http://localhost:3000/.notifications/WebSocketChannel2023/>
    notify:channelType  notify:WebHookSubscription2021;
    notify:feature      notify:accept ,
                        notify:endAt ,
                        notify:rate ,
                        notify:startAt ,
                        notify:state .
```

This says that there are two available subscription services that can be used for notifications and where to find them.
Note that these discovery requests also support content-negotiation, so you could ask for JSON-LD if you prefer.
Currently, however, this JSON-LD will not match the examples from the notification specification.

The above tells us where to send subscriptions and which features are supported for those services.
You subscribe to a channel by `POST`ing a JSON-LD document to the subscription services.
There are some small differences in the structure of these documents, depending on the channel type,
which will be discussed below.

Subscription requests need to be authenticated using Solid-OIDC.
The server will check whether you have `Read` permission on the resource you want to listen to.
Requests without `Read` permission will be rejected.

## Notification channel types

There are currently up to two supported ways to get notifications in CSS, depending on your configuration:
the notification channel types [`WebSocketChannel2023`](https://solid.github.io/notifications/websocket-channel-2023);
and [`WebHookSubscription2021`](https://github.com/solid/notifications/blob/main/webhook-subscription-2021.md).
_**Note:** `WebHookSubscription2021` has been deprecated, and will be replaced
by the newer `WebHookChannel2023` implementation once that specification is published;
the practical differences are expected to be minor._

### WebSockets

To subscribe to the `http://localhost:3000/foo` resource using WebSockets,
you use an authenticated `POST` request to send the following JSON-LD document to the server,
at `http://localhost:3000/.notifications/WebSocketChannel2023/`:

```json
{
  "@context": ["https://www.w3.org/ns/solid/notification/v1"],
  "type": "http://www.w3.org/ns/solid/notifications#WebSocketChannel2023",
  "topic": "http://localhost:3000/foo"
}
```

If you have `Read` permissions, the server's reply will look like this:

```json
{
  "@context": [ "https://www.w3.org/ns/solid/notification/v1" ],
  "id": "http://localhost:3000/.notifications/WebSocketChannel2023/dea6f614-08ab-4cc1-bbca-5dece0afb1e2",
  "type": "http://www.w3.org/ns/solid/notifications#WebSocketChannel2023",
  "topic": "http://localhost:3000/foo",
  "receiveFrom": "ws://localhost:3000/.notifications/WebSocketChannel2023/?auth=http%3A%2F%2Flocalhost%3A3000%2F.notifications%2FWebSocketChannel2023%2Fdea6f614-08ab-4cc1-bbca-5dece0afb1e2"
}
```

The most important field is `receiveFrom`.
This field tells you the WebSocket to which you need to connect, through which you will start receiving notifications.
In JavaScript, this can be done using the WebSocket object, such as:

```javascript
const ws = new WebSocket(receiveFrom);
ws.on('message', (notification) => console.log(notification));
```

### WebHooks

Similar to the WebSocket subscription, below is sample JSON-LD
that would be sent to `http://localhost:3000/.notifications/WebHookSubscription2021/`:

```json
{
  "@context": [ "https://www.w3.org/ns/solid/notification/v1" ],
  "type": "http://www.w3.org/ns/solid/notifications#WebHookSubscription2021",
  "topic": "http://localhost:3000/foo",
  "target": "https://example.com/webhook"
}
```

Note that this document has an additional `target` field.
This is the WebHook URL of your server, the URL to which you want the notifications to be sent.

The response would then be something like this:

```json
{
  "@context": [ "https://www.w3.org/ns/solid/notification/v1" ],
  "id": "http://localhost:3000/.notifications/WebHookSubscription2021/eeaf2c17-699a-4e53-8355-e91d13807e5f",
  "type": "http://www.w3.org/ns/solid/notifications#WebHookSubscription2021",
  "topic": "http://localhost:3000/foo",
  "target": "https://example.com/webhook",
  "unsubscribe_endpoint": "http://localhost:3000/.notifications/WebHookSubscription2021/eeaf2c17-699a-4e53-8355-e91d13807e5f"
}
```

The `unsubscribe_endpoint` field is new here.
Once created, the notification channel can be removed and notifications stopped
by sending a `DELETE` request to the URL found in that field.

## Notification format

Below is an example notification that would be sent when a resource changes:

```json
{
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://www.w3.org/ns/solid/notification/v1"
  ],
  "id": "urn:123456:http://example.com/foo",
  "type": "Update",
  "object": "http://localhost:3000/foo",
  "state": "987654",
  "published": "2023-02-09T15:08:12.345Z"
}
```

A notification contains the following fields:

* **`id`**: A unique identifier for this notification.
* **`type`**: What happened to trigger the notification. We discuss the possible values below.
* **`object`**: The resource that changed.
* **`state`**: An identifier indicating the state of the resource.
  This corresponds to the `ETag` value you get when doing a request on the resource itself.
* **`published`**: When this change occurred.

### Notification types

CSS supports five different notification types that the client can receive.
The format of the notification can slightly change depending on the type.

Resource notification types:

* **`Create`**: When the resource is created.
* **`Update`**: When the existing resource is changed.
* **`Delete`**: When the resource is deleted. Does not have a `state` field.

Additionally, when listening to a container,
there are two extra notifications that are sent out when the contents of the container change.
For these notifications, the `object` fields references the resource that was added or removed,
while the new `target` field references the container itself.

* **`Add`**: When a new resource is added to the container.
* **`Remove`**: When a resource is removed from the container.

## Features

The Solid notification specification describes several extra features that can be supported by notification channels.
By default, these are all supported on the channels of a CSS instance,
as can be seen in the descriptions returned by the server above.
Each feature can be enabled by adding a field to the JSON-LD you send during subscription.
The available fields are:

* **`startAt`**: An `xsd:dateTime` describing when you want notifications to start.
  No notifications will be sent on this channel before this time.
* **`endAt`**: An `xsd:dateTime` describing when you want notifications to stop.
  The channel will be destroyed at that time, and no more notifications will be sent.
* **`state`**: A string corresponding to the `state` string of a resource notification.
  If this value differs from the actual state of the resource,
  a notification will be sent out immediately to inform the client that its stored state is outdated.
* **`rate`**: An `xsd:duration` indicating how often notifications can be sent out.
  A new notification will only be sent out after this much time has passed since the previous notification.
* **`accept`**: A description of the `content-type(s)` in which the client would want to receive the notifications.
  Expects the same values as an `Accept` HTTP header.
