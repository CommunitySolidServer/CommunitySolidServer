# Pull requests
The community server is fully written in [Typescript](https://www.typescriptlang.org/docs/home.html).

All changes should be done through
[pull requests](https://docs.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request-from-a-fork). 

We recommend first discussing a possible solution in the relevant issue
to reduce the amount of changes that will be requested.

In case any of your changes are breaking, make sure you target the next major branch (`versions/x.0.0`)
instead of the main branch. Breaking changes include: changing interface/class signatures,
potentially breaking external custom configurations, 
and breaking how internal data is stored.
In case of doubt you probably want to target the next major branch.

We make use of [Conventional Commits](https://www.conventionalcommits.org).

Don't forget to update the [release notes](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/RELEASE_NOTES.md) 
when adding new major features.
Also update any relevant documentation in case this is needed.

When making changes to a pull request, 
we prefer to update the existing commits with a rebase instead of appending new commits,
this way the PR can be rebased directly onto the target branch
instead of needing to be squashed.

There are strict requirements from the linter and the test coverage before a PR is valid.
These are configured to run automatically when trying to commit to git.
Although there are no tests for it (yet), we strongly advice documenting with [TSdoc](https://github.com/microsoft/tsdoc).

If a list of entries is alphabetically sorted, 
such as [index.ts](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/src/index.ts),
make sure it stays that way.
