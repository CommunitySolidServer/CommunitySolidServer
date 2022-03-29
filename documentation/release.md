# Releasing a new version

This is only relevant if you are a developer with push access responsible for doing a new release.

Steps to follow:
 * Merge `main` into `versions/x.0.0`.
 * Verify if there are issues when upgrading an existing installation to the new version.
   * Can the data still be accessed?
   * Does authentication still work?
   * Is there an issue upgrading the recipes at https://github.com/CommunitySolidServer/recipes
   * None of the above has to be blocking per se, but should be noted in the release notes if relevant.
 * Update all Components.js references to the new version.
   * All contexts in all configs to 
     `https://linkedsoftwaredependencies.org/bundles/npm/@solid/community-server/^x.0.0/components/context.jsonld`.
   * Update all `lsd` entries in `package.json` to the new version.
   * Commit this with `chore: Update configs to vx.0.0`.
 * `npm version major -m "Release version %s of the npm package."`
   * This will update the `package.json`, generate a tag, and generate the new entries in `CHANGELOG.md`.
 * Manually edit the `CHANGELOG.md`.
   * First reverse the list of new entries so they go from old to new.
   * Put all entries in matching categories, look at the previous release for reference.
     * Most `chore` and `docs` entries can probably be removed.
   * Make sure there are 2 newlines between this and the previous section.
 * `git push --follow-tags`
 * Merge `versions/x.0.0` into `main`.
 * Do a GitHub release.
 * `npm publish`
 * Rename the `versions/x.0.0` branch to the next version.
 * Update `.github/workflows/schedule.yml` to point at the new branch.
 * Potentially upgrade the recipes at https://github.com/CommunitySolidServer/recipes
