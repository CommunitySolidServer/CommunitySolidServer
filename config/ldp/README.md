# LDP

Options related to the Linked Data Platform implementation.
This is the core part of the Solid server.

## Authentication

Covers how agents are identified.

* *debug-auth-header*: Allows authentication headers such as `WebID http://test.com/card#me`
  to identify as that WebID without further checks.
* *debug-test-agent*: Always assumes the agent is the set identifier.
* *dpop-bearer*: Uses the default DPoP and Bearer identification.

## Authorization

Covers how operations are authorized (or rejected).

* *acp*: Use Access Control Policy.
* *allow-all*: No authorization, everything is allowed.
* *webacl*: Use Web Access Control.

## Handler

Contains the default LDP handler that will handle most requests.

* *default*: The default setup.
  Some identifiers seen here are defined by the other options found in this document.

## Metadata-Parser

Contains a list of parsers that will be run on incoming requests to generate metadata.

* *default*: Contains the default parsers. Can be added to when specific parsers are required.

## Metadata-Writer

Contains a list of metadata writers that will be run on outgoing responses.

* *default*: Contains the default writers. Can be added to when specific parsers are required.

## Modes

Determines which modes are needed for requests,
by default this is based on the used HTTP method.

* *default*: Bases required modes on HTTP method.
