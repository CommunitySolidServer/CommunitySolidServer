# Releasing a new version

This is only relevant if you are a developer with push access responsible for doing a new release.

Steps to follow:

* **Major** releases only:
    * Merge `main` into `versions/next-major`.
* Verify if there are issues when upgrading an existing installation to the new version.
    * Can the data still be accessed?
    * Does authentication still work?
    * Is there an issue upgrading any of the dependent repositories (see below for links)?
    * None of the above has to be blocking per se, but should be noted in the release notes if relevant.
* **Major** and **Minor** releases:
    * Verify that the `RELEASE_NOTES.md` are correct.
* `npm run release -- -r major/minor/patch`
    * Automatically updates Components.js references to the new version in case of a major release.
      Committed with `chore(release): Update configs to vx.0.0`.
    * Updates the `package.json`, and generates the new entries in `CHANGELOG.md`.
      Commits with `chore(release): Release version vx.y.z of the npm package`
    * Optionally run `npx commit-and-tag-version -r major/minor/patch --dry-run` to preview the commands that will be run
      and the changes to `CHANGELOG.md`.
* The `postrelease` script will now prompt you to manually edit the `CHANGELOG.md`.
    * All entries are added in separate sections of the new release according to their commit prefixes.
    * Re-organize the entries accordingly, referencing previous releases. Most of the entries in Chores and
      Documentation can be removed.
    * Press any key in your terminal when your changes are ready.
    * The `postrelease` script will amend the release commit, create an annotated tag and push changes to origin.
* **Major** releases only:
    * Merge `versions/next-major` into `main` and push.
* Do a GitHub release.
* `npm publish`
* If there is no **pre-release** of a higher version:
    * `npm dist-tag add @solid/community-server@x.y.z next`
* Potentially upgrade dependent repositories:
    * Recipes at <https://github.com/CommunitySolidServer/recipes/>
    * Tutorials at <https://github.com/CommunitySolidServer/tutorials/>
    * Generator at <https://github.com/CommunitySolidServer/configuration-generator/>
    * Hello world component at <https://github.com/CommunitySolidServer/hello-world-component/>

## Changes when doing a pre-release

* Version with `npm run release -- -r major --prerelease alpha`
* Do not merge `versions/next-major` into `main`.
* Publish with `npm publish --tag next`.
