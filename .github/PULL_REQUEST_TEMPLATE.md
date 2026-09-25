#### 📁 Related issues

<!--
Reference any relevant issues here. Closing keywords only have an effect when targeting the main branch. If there are no related issues, you must first create an issue through https://github.com/CommunitySolidServer/CommunitySolidServer/issues/new/choose
-->

#### ✍️ Description

<!-- Describe the relevant changes in this PR. Also add notes that might be relevant for code reviewers. -->

#### 🤖 AI assistance

<!--
State whether you used generative AI to prepare this contribution, including code, tests, documentation, the PR description, or review comments. If so, name the tools and briefly describe their role. Update this section if you use AI during review.
See the policy: https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/documentation/markdown/contributing/making-changes.md#use-of-generative-ai
-->

#### 🧪 Verification

<!-- Describe the checks and tests you ran, their results, and any limitations. -->

* [ ] I have personally reviewed and understood this contribution and can explain its design and verification.

### ✅ PR check list

Before this pull request can be merged, a core maintainer will check whether

* [ ] this PR is labeled with the correct semver label
    * semver.patch: Backwards compatible bug fixes.
    * semver.minor: Backwards compatible feature additions.
    * semver.major: Backwards incompatible changes to APIs, configuration behaviour, or stored data.
* [ ] the correct branch is targeted.
    * `main`: Backwards compatible bug fixes and feature additions (`semver.patch` and `semver.minor`).
    * `versions/next-major`: Breaking changes (`semver.major`).
* [ ] the RELEASE_NOTES.md document in case of relevant feature or config changes.
* [ ] any relevant documentation was updated to reflect the changes in this PR.

<!-- Try to check these to the best of your abilities before opening the PR -->
