# Architecture overview

The initial architecture document the project was started from can be found [here](https://rubenverborgh.github.io/solid-server-architecture/solid-architecture-v1-3-0.pdf).
Many things have been added since the original inception of the project,
but the core ideas within that document are still valid.

As can be seen from the architecture, an important idea is the modularity of all components.
No actual implementations are defined there, only their interfaces.
Making all the components independent of each other in such a way provides us with an enormous flexibility:
they can all be replaced by a different implementation, without impacting anything else.
This is how we can provide many different configurations for the server,
and why it is impossible to provide ready solutions for all possible combinations.

## Handlers
A very important building block that gets reused in many places is the `AsyncHandler`.
The idea is that a handler has 2 important functions.
`canHandle` determines if this class is capable of correctly handling the request,
and throws an error if it can not.
For example, a class that converts JSON-LD to turtle can handle all requests containing JSON-LD data,
but does not know what to do with a request that contains a JPEG.
The second function is `handle` where the class executes on the input data and returns the result.
If an error gets thrown here it means there is an issue with the input.
For example, if the input data claims to be JSON-LD but is actually not.

The power of using this interface really shines when using certain utility classes.
The one we use the most is the `WaterfallHandler`,
which takes as input a list of handlers of the same type.
The input and output of a `WaterfallHandler` is the same as those of its inputs,
meaning it can be used in the same places.
When doing a `canHandle` call, it will iterate over all its input handlers
to find the first one where the `canHandle` call succeeds,
and when calling `handle` it will return the result of that specific handler.
This allows us to chain together many handlers that each have their specific niche,
such as handler that each support a specific HTTP method (GET/PUT/POST/etc.),
or handlers that only take requests targeting a specific subset of URLs.
To the parent class it will look like it has a handler that supports all methods,
while in practice it will be a `WaterfallHandler` containing all these separate handlers.

Some other utility classes are the `ParallelHandler` that runs all handlers simultaneously,
and the `SequenceHandler` that runs all of them one after the other.
Since multiple handlers are executed here, these only work for handlers that have no output.

## Streams
Almost all data is handled in a streaming fashion.
This allows us to work with very large resources without having to fully load them in memory,
a client could be reading data that is being returned by the server while the server is still reading the file.
Internally this means we are mostly handling data as `Readable` objects.
We actually use `Guarded<Readable>` which is an internal format we created to help us with error handling.
Such streams can be created using utility functions such as `guardStream` and `guardedStreamFrom`.
Similarly, we have a `pipeSafely` to pipe streams in such a way that also helps with errors.

## Example request
In this section we will give a high level overview of all the components
a request passes through when it enters the server.
This is specifically an LDP request, e.g. a POST request to create a new resource.

1. The correct `HttpHandler` gets found, responsible for LDP requests.
2. The HTTP request gets parsed into a manageable format, both body and metadata such as headers.
3. The identification credentials of the request, if any, are extracted and parsed to authenticate the calling agent.
4. The request gets authorized or rejected, based on the credentials from step 3
   and the authorization rules of the target resource.
5. Based on the HTTP method, the corresponding method from the `ResourceStore` gets called,
   which in the case of a POST request will return the location of the newly created error.
6. The returned data and metadata get converted to an HTTP response and sent back in the `ResponseWriter`.

In case any of the steps above error, an error will be thrown.
The `ErrorHandler` will convert the error to an HTTP response to be returned.

Below are sections that go deeper into the specific steps.
Not all steps are covered yet and will be added in the future.

[How authentication and authorization work](authorization.md)
[What the `ResourceStore` looks like](resource-store.md)
