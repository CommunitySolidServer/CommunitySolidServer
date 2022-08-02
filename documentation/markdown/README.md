---
hide:
  - navigation
---

# Welcome

Welcome to the Community Solid Server!
Here we will cover many aspects of the server,
such as how to propose changes,
what the architecture looks like,
and how to use many of the features the server provides.

The documentation here is still incomplete both in content and structure, so feel free to open
a [discussion](https://github.com/CommunitySolidServer/CommunitySolidServer/discussions) about things you want to see added.
While we try to update this documentation together with updates in the code,
it is always possible we miss something,
so please report it if you find incorrect information or links that no longer work.

An introductory tutorial that gives a quick overview of the Solid and CSS basics can be found
[here](https://github.com/KNowledgeOnWebScale/solid-linked-data-workshops-hands-on-exercises/blob/main/css-tutorial.md).
This is a good way to get started with the server and its setup.

If you want to know what is new in the latest version,
you can check out the [release notes](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/RELEASE_NOTES.md)
for a high level overview and information on how to migrate your configuration to the next version.
A list that includes all minor changes can be found in 
the [changelog](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/CHANGELOG.md)

## Using the server

 * [Basic example HTTP requests](example-requests.md)
 * [How to use the Identity Provider](identity-provider.md)
 * [How to automate authentication](client-credentials.md)
 * [How to automatically seed pods on startup](seeding-pods.md)

## What the internals look like

 * [How the server uses dependency injection](dependency-injection.md)
 * [What the architecture looks like](architecture.md)
 
## Making changes

 * [How to make changes to the repository](making-changes.md)

For core developers with push access only: 

 * [How to release a new version](release.md)
