# Server initialization

When starting the server, multiple Initializers trigger to set up everything correctly,
the last one of which starts listening to the specified port.
Similarly, when stopping the server several Finalizers trigger to clean up where necessary,
although the latter only happens when starting the server through code.

## App

```mermaid
flowchart TD
  App("<strong>App</strong><br>App")
  App --> AppArgs

  subgraph AppArgs[" "]
    Initializer("<strong>Initializer</strong><br><i>Initializer</i>")
    AppFinalizer("<strong>Finalizer</strong><br><i>Finalizer</i>")
  end
```

`App` (`urn:solid-server:default:App`) is the main component that gets instantiated by Components.js.
Every other component should be able to trace an instantiation path back to it if it also wants to be instantiated.

It's only function is to contain an `Initializer` and `Finalizer`
which get called by calling `start`/`stop` respectively.

## Initializer

```mermaid
flowchart TD
  Initializer("<strong>Initializer</strong><br>SequenceHandler")
  Initializer --> InitializerArgs

  subgraph InitializerArgs[" "]
    direction LR
    LoggerInitializer("<strong>LoggerInitializer</strong><br>LoggerInitializer")
    PrimaryInitializer("<strong>PrimaryInitializer</strong><br>ProcessHandler")
    WorkerInitializer("<strong>WorkerInitializer</strong><br>ProcessHandler")
  end

  LoggerInitializer --> PrimaryInitializer
  PrimaryInitializer --> WorkerInitializer
```

The very first thing that needs to happen is initializing the logger.
Before this other classes will be unable to use logging.

The `PrimaryInitializer` will only trigger once, in the primary worker thread,
while the `WorkerInitializer` will trigger for every worker thread.
Although if your server setup is single-threaded, which is the default,
there is no relevant difference between those two.

### PrimaryInitializer

```mermaid
flowchart TD
  PrimaryInitializer("<strong>PrimaryInitializer</strong><br>ProcessHandler")
  PrimaryInitializer --> PrimarySequenceInitializer("<strong>PrimarySequenceInitializer</strong><br>SequenceHandler")
  PrimarySequenceInitializer --> PrimarySequenceInitializerArgs

  subgraph PrimarySequenceInitializerArgs[" "]
    direction LR
    CleanupInitializer("<strong>CleanupInitializer</strong><br>SequenceHandler")
    PrimaryParallelInitializer("<strong>PrimaryParallelInitializer</strong><br>ParallelHandler")
    WorkerManager("<strong>WorkerManager</strong><br>WorkerManager")
  end

  CleanupInitializer --> PrimaryParallelInitializer
  PrimaryParallelInitializer --> WorkerManager
```

The above is a simplification of all the initializers that are present in the `PrimaryInitializer`
as there are several smaller initializers that also trigger but are less relevant here.

The `CleanupInitializer` is an initializer that cleans up anything
that might have remained from a previous server start
and could impact behaviour.
Relevant components in other parts of the configuration are responsible for adding themselves to this array if needed.
An example of this is file-based locking components which might need to remove any dangling locking files.

The `PrimaryParallelInitializer` can be used to add any initializers to that have to happen in the primary process.
This makes it easier for users to add initializers by being able to append to its handlers.

The `WorkerManager` is responsible for setting up the worker threads, if any.

### WorkerInitializer

```mermaid
flowchart TD
  WorkerInitializer("<strong>WorkerInitializer</strong><br>ProcessHandler")
  WorkerInitializer --> WorkerSequenceInitializer("<strong>WorkerSequenceInitializer</strong><br>SequenceHandler")
  WorkerSequenceInitializer --> WorkerSequenceInitializerArgs

  subgraph WorkerSequenceInitializerArgs[" "]
    direction LR
    WorkerParallelInitializer("<strong>WorkerParallelInitializer</strong><br>ParallelHandler")
    ServerInitializer("<strong>ServerInitializer</strong><br>ServerInitializer")
  end

  WorkerParallelInitializer --> ServerInitializer
```

The `WorkerInitializer` is quite similar to the `PrimaryInitializer` but triggers once per worker thread.
Like the `PrimaryParallelInitializer`, the `WorkerParallelInitializer` can be used
to add any custom initializers that need to run.

### ServerInitializer

The `ServerInitializer` is the initializer that finally starts up the server by listening to the relevant port,
once all the initialization described above is finished.
It takes as input 2 components: a `HttpServerFactory` and a `ServerListener`.

```mermaid
flowchart TD
  ServerInitializer("<strong>ServerInitializer</strong><br>ServerInitializer")
  ServerInitializer --> ServerInitializerArgs

  subgraph ServerInitializerArgs[" "]
    direction LR
    ServerFactory("<strong>ServerFactory</strong><br>BaseServerFactory")
    ServerListener("<strong>ServerListener</strong><br>ParallelHandler")
  end

  ServerListener --> HandlerServerListener("<strong>HandlerServerListener</strong><br>HandlerServerListener")

  HandlerServerListener --> HttpHandler("<strong>HttpHandler</strong><br><i>HttpHandler</i>")
```

The `HttpServerFactory` is responsible for starting a server on a given port.
Depending on the configuration this can be an HTTP or an HTTPS server.
The created server emits events when it receives requests.

A `ServerListener` is a class that takes the created server as input and attaches a listener to interpret events.
One listener that is always used is the `urn:solid-server:default:HandlerServerListener`,
which calls an `HttpHandler` [to resolve HTTP requests](http-handler.md).

Sometimes it is necessary to add additional listeners,
these can then be added to the `urn:solid-server:default:ServerListener` as it is a `ParallellHandler`.
An example of this is when WebSockets are used [to handle notifications](notifications.md).
