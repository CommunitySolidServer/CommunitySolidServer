# Choosing the authorization method for your server

The CSS comes with support for two different authorization solutions:
[Web Access Control (WAC)](https://solidproject.org/TR/wac)
and [Access Control Policy (ACP)](https://solid.github.io/authorization-panel/acp-specification/).
When configuring a server, one of these needs to be picked if you do not want everyone to have full access to your data.
Both of these are similar in that they both make use of RDF resources to describe who can access which documents,

WAC is the older specification of the two,
it was designed together with the beginning of the Solid specification.
Because of that, there is more tooling available that can interpret the corresponding authorization resources,
potentially making it easier to get started with Solid development.

ACP is a more recent specification,
that was made to address certain concerns within WAC.
ACP provides more options in how to define who gets to access your data,
allowing you to have better security.

When using WAC, you define which WebIDs have access to certain data.
When you then authenticate with a Solid client,
that client will identify with your WebID,
indicating to the server that it is allowed to access that data.
The problem is that there is no (safe) way to differentiate between clients.
This means that if you use a client to store your favorite movies in your pod,
and another one to store your bank details,
the movie client would be able to access your bank details if it was malicious.
ACP on the other hand allows you to set more specific restrictions,
where clients also have to identify themselves.
This way you can make sure the movie client can only access movie data.

Currently, the CSS still enables WAC in most of the configurations bundled with the server,
as we want the server to be easily accessible for newer users,
for whom the chances are higher they are using apps only compatible with WAC.
However, we are planning to eventually phase this out in favor of ACP,
starting with logged warnings when WAC is enabled,
and in the end changing the bundled configurations to use ACP instead.
