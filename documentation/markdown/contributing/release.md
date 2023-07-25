# Releasing a new major version

This is only relevant if you are a developer with push access responsible for doing a new release.

Steps to follow:

* Merge `main` into `versions/next-major`.
* Verify if there are issues when upgrading an existing installation to the new version.
    * Can the data still be accessed?
    * Does authentication still work?
    * Is there an issue upgrading any of the dependent repositories (see below for links)?
    * None of the above has to be blocking per se, but should be noted in the release notes if relevant.
* Verify that the `RELEASE_NOTES.md` are correct.
* `npm run release -- -r major`
    * Automatically updates Components.js references to the new version.
      Committed with `chore(release): Update configs to vx.0.0`.
    * Updates the `package.json`, and generates the new entries in `CHANGELOG.md`.
      Commits with `chore(release): Release version vx.0.0 of the npm package`
    * Optionally run `npx commit-and-tag-version -r major --dry-run` to preview the commands that will be run
      and the changes to `CHANGELOG.md`.
* The `postrelease` script will now prompt you to manually edit the `CHANGELOG.md`.
    * All entries are added in separate sections of the new release according to their commit prefixes.
    * Re-organize the entries accordingly, referencing previous releases. Most of the entries in Chores and
      Documentation can be removed.
    * Press any key in your terminal when your changes are ready.
    * The `postrelease` script will amend the release commit, create an annotated tag and push changes to origin.
* Merge `versions/next-major` into `main` and push.
* Do a GitHub release.
* `npm publish`
    * `npm dist-tag add @solid/community-server@x.0.0 next`
* Rename the `versions/x.0.0` branch to the next version.
* Potentially upgrade dependent repositories:
    * Recipes at <https://github.com/CommunitySolidServer/recipes/>
    * Tutorials at <https://github.com/CommunitySolidServer/tutorials/>
    * Generator at <https://github.com/CommunitySolidServer/configuration-generator/>
    * Hello world component at <https://github.com/CommunitySolidServer/hello-world-component/>

## Changes when doing a pre-release

* Version with `npm run release -- -r major --prerelease alpha`
* Do not merge `versions/next-major` into `main`.
* Publish with `npm publish --tag next`.
* Do not update the branch or anything related.

## Changes when doing a minor release

* Version with `npm run release -- -r minor`
* Do not merge `versions/next-major` into `main`.
