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

## Use of generative AI

Generative AI tools, including large language models (LLMs), may assist contributions to Community Solid Server.
You remain responsible for everything you submit, including code, tests, documentation, issues, and review comments.
Using AI does not reduce the need for human judgment or change the project's quality requirements.

### Human review and communication

Before submitting a contribution to the CSS repository, including a draft pull request:

* Personally read and understand the entire contribution, including any generated tests and documentation.
  Be able to explain why the change is needed and how it fits the existing code and architecture.
  Maintainers should not be the first people to read the code.
* Verify factual claims against the code, relevant specifications, or reproducible examples.
  Run the relevant checks and tests, and report what you checked and any limitations.
  An AI-generated explanation or assurance that tests pass is not evidence of verification.
* Keep changes, comments, and descriptions focused and concise.
  Remove unnecessary abstractions, unrelated changes, and commentary that does not help a reader understand the change.

Use your own fork to prepare work that has not yet received this human review.

During review, read and consider the maintainer's feedback yourself.
Address the underlying concern, and ask for clarification if you do not understand it.
Do not simply pass feedback to an AI tool and submit its response or edits without evaluating them.
Review each revision before asking maintainers to look again.
Explain your decisions in your own words; clear, imperfect English is welcome.
AI agents must not independently open issues or pull requests, or conduct review conversations on your behalf.

### Disclosure and responsibility

Disclose AI use in the pull request description, including use to produce code, tests, documentation, or public messages.
Briefly state which tools you used and what they helped produce.
For an AI-assisted issue or comment outside a pull request, include the disclosure with that contribution.
You must also meet the applicable licensing, attribution, and tool-use obligations for any material you submit.

### Maintainer review

A contribution should reduce the work needed to improve and maintain CSS.
Prompting a tool and leaving maintainers to verify its output is not sufficient contributor review.
Where possible, have a colleague review the contribution before requesting maintainer time.
Maintainers may ask for further preparation or close a contribution when its expected review and maintenance cost
outweighs its benefit, without having to establish whether AI was used or provide an alternative implementation.

This policy is informed by [Qiskit's generative AI guidelines][qiskit-ai].

[qiskit-ai]: https://github.com/Qiskit/qiskit/blob/main/CONTRIBUTING.md#use-of-generative-ai
