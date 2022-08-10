# Releasing a new version

This is only relevant if you are a developer with push access responsible for doing a new release.

Steps to follow:

* Merge `main` into `versions/x.0.0`.
* Verify if there are issues when upgrading an existing installation to the new version.
  * Can the data still be accessed?
  * Does authentication still work?
  * Is there an issue upgrading any of the dependent repositories (see below for links)?
  * None of the above has to be blocking per se, but should be noted in the release notes if relevant.
* Verify that the RELEASE_NOTES.md are correct.
* `npm run release:prepare -- -r major` or `npx standard-version -r major`
  * Automatically updates Components.js references to the new version. Committed with `chore(release): Update configs to vx.0.0`.
  * Updates the `package.json`, and generate the new entries in `CHANGELOG.md`. Commited with `chore(release): Release version vx0.0 of the npm package`
  * You can always add `--dry-run` to the above command to preview the commands that will be run and the changes to `CHANGELOG.md`.
* Manually edit the `CHANGELOG.md`.
  * All entries are added in separate sections of the new release according to their commit prefixes.
  * Re-organize the entries accordingly, referencing previous releases.
    * Most of the entries in Chores and Documentation can be removed.
  * Make sure there are 2 newlines between this and the previous section.
  * `npm run release` or `node ./scripts/finalizeRelease.ts` to add manual changes to the release commit, tag it and then push it to origin.
* Merge `versions/x.0.0` into `main` and push.
* Do a GitHub release.
* `npm publish`
  * Check if there is a `next` tag that needs to be replaced.
* Rename the `versions/x.0.0` branch to the next version.
* Update `.github/workflows/schedule.yml` and `.github/dependabot.yml` to point at the new branch.
* Potentially upgrade dependent repositories:
  * Recipes at <https://github.com/CommunitySolidServer/recipes/>
  * Tutorials at <https://github.com/CommunitySolidServer/tutorials/>

Changes when doing a pre-release of a major version:

* Version with `npm release -- -r major --pre-release alpha`
* Do not merge `versions/x.0.0` into `main`.
* Publish with `npm publish --tag next`.
* Do not update the branch or anything related.
