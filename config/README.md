# Configuration

This folder contains several configurations that can be used to start up the server.
These can be used directly, or used as inspiration on how you would want to configure your server.
All those configurations are created in the same way:
features are enabled or disabled by choosing a specific option for every component.
All components are represented by the subfolders found in the folders here:
`ldp` contains all LDP related components,
`identity` all IDP components, etc.
Options are then chosen by importing 1 entry from every component subfolder.
More information on how this can be done manually,
can be found in this [tutorial](https://github.com/CommunitySolidServer/tutorials/blob/main/custom-configurations.md).

As manually changing server options can be cumbersome,
there is also an online [configuration generator](https://communitysolidserver.github.io/configuration-generator/).

Below we give an overview of the main identifying features of the configurations.
We start with all features of the default configuration,
after which we will explain in which features the other ones differ from it.

## default.json

This is the configuration that is used if no configuration is provided when starting the server.
It stores all data in memory, so this server is perfect for quickly trying some things out,
but not if you want a persistent server.

For authorization, it uses [Web Access Control (WAC)](https://solid.github.io/web-access-control-spec/),
it supports all [notification methods](https://solidproject.org/TR/notifications-protocol) implemented in CSS,
allows users to create accounts, pods, WebIDs, and use them for [Solid-OIDC](https://solid.github.io/solid-oidc/).

It is also initialized with an `index.html` page at root level,
with permissions set in such a way that everyone has full access to the server.

Although strictly not allowed by the Solid specification,
this configuration allows users to both write data at root level of the server,
and also create pods in subcontainers.
In all other configurations only or the other (or neither) will be allowed,
but here both are enabled for maximum flexibility when testing things out.

## file.json

The most important difference with the `default.json` configuration is that this one stores its data as files on disk,
thereby making the data persistent.
Besides that, it also prevents data from being written to the root,
the only way to add data is to create a pod and add data there.
To still show something at root level when the server is started,
a static page is shown which can not be modified using standard Solid requests.

## file-acp.json

The only difference with `file.json`is that this uses
[Access Control Policy (ACP)](https://solid.github.io/authorization-panel/acp-specification/)
for authorization instead of WAC.

## file-root.json

This configuration starts from `file.json`, but does not allow the creation of accounts.
Instead, it allows data to be written directly to the root of the server.
To make sure users can write data there after starting the server,
permissions have been set to grant everyone full access,
so this needs to be changed after starting the server.

## file-root-pod.json

The same idea as `file-root.json`,
but here it is done by creating an account with a pod
in the root of the server the first time it is started.
The credentials to this account are stored in the configuration so should be changed afterwards.
This has the advantage of both having your data at root level,
but also allowing you to authenticate using Solid-OIDC.

## https-file-cli.json

A variant of `file.json` that uses HTTPS of HTTP.
The required key and cert file paths need to be defined using two new CLI options: `--httpsKey` and `-httpCert`.

## example-https-file.json

Another way to define HTTPS, but this time through the configuration file itself instead of the CLI.
As can be seen in the configuration itself, two paths are defined, pointing to the key and cert files.
To actually use this solution, you need to update the paths in that file before running the server.

## sparql-endpoint.json

Sets up a server that uses a SPARQL endpoint to store the data.
Only RDF data can be stored on a server using this configuration.
For internal data, such as accounts, temporary OIDC resources, etc,
the servers uses non-RDF data formats.
While other configurations store this kind of data in the same backend as the Solid data,
this is not feasible when using a SPARQL endpoint.
For this reason, this configuration stores all that data in memory,
meaning this solution should not be used if you want persistent accounts.

## sparql-endpoint-root.json

This differs from `sparql-endpoint.json` in the same way as `file-root.json` differs from `file.json`.

## sparql-file-storage.json

Similar to `sparql-endpoint.json` with the main difference being
that here internal data is stored on disk instead of in memory.

## memory-subdomains.json

A memory-based server whose main differentiating feature is how pod URLs are constructed.
In most other configurations, pods are created by appending the chosen name to the base URL of the server,
so for a server running at `http://example.com/`,
choosing the name `test` for your pod would result in `http://example.com/test/`.
With this configuration, the name is used as a subdomain of the url instead,
so the above values would result in a pod at `http://test.example.com/` instead.

## quota-file.json

A file-based server that limits the amount of data a user can put in a pod.
The values in the configuration determine the limit.

## path-routing.json

This configuration serves as an example of how a server can be configured
to serve data from different backends depending on the URL that is used.
In this example, all data in the `/sparql/` container will be stored in a SPARQL backend,
and similarly for `/memory/` and `/file/`.

## oidc.json

A configuration that sets up the server to only function as an Identity Provider.
It does not support creating pods or storing data on the server,
the only available options are creating accounts and linking them to WebIDs.
This way the server can be used to identify those WebIDs during an OIDC interaction.
