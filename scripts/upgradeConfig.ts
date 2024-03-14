#!/usr/bin/env ts-node
/* eslint-disable no-console */
import escapeStringRegexp from 'escape-string-regexp';
import { readdir, readFile, writeFile } from 'fs-extra';
import simpleGit from 'simple-git';
import { joinFilePath, readPackageJson } from '../src/util/PathUtil';

/**
 * Script: upgradeConfigs.ts
 * Run with: ts-node scripts/upgradeConfig.ts
 * ------------------------------------------
 * Upgrades the lsd:module references to CSS in package.json
 * and all JSON-LD config files.
 * This script is run alongside standard-version after the
 * version bump is done in package.json but before the
 * release has been committed.
 */

/**
 * Search and replace the version of a component with given name
 *
 * @param  filePath - File to search/replace
 * @param  regex - RegExp matching the component reference
 * @param  version - Semantic version to change to
 */
async function replaceComponentVersion(filePath: string, regex: RegExp, version: string): Promise<void> {
  console.log(`Replacing version in ${filePath}`);
  const data = await readFile(filePath, 'utf8');
  const result = data.replace(regex, `$1^${version}`);
  return writeFile(filePath, result, 'utf8');
}

/**
 * Recursive search for files that match a given Regex
 *
 * @param  path - Path of folder to start search in
 * @param  regex - A regular expression to which file names will be matched
 *
 * @returns Promise with all file pathss
 */
async function getFilePaths(path: string, regex: RegExp): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });

  const files = entries
    .filter((file): boolean => !file.isDirectory())
    .filter((file): boolean => regex.test(file.name))
    .map((file): string => joinFilePath(path, file.name));

  const folders = entries.filter((folder): boolean => folder.isDirectory());

  for (const folder of folders) {
    files.push(...await getFilePaths(joinFilePath(path, folder.name), regex));
  }

  return files;
}

/**
 * Changes version of Component references in package.json and
 * JSON-LD config files (config/) to the current major version of
 * the NPM package.
 * Commits changes to config files (not package.json, changes to
 * that file are included in the release commit).
 */
async function upgradeConfig(): Promise<void> {
  const pkg = await readPackageJson() as Record<string, unknown>;
  const major = (pkg.version as string).split('.')[0];

  console.log(`Changing ${pkg['lsd:module'] as string} references to ${major}.0.0\n`);

  const configs = await getFilePaths('config/', /.+\.json/u);
  configs.push(...await getFilePaths('test/integration/config/', /.+\.json/u));
  configs.push(...await getFilePaths('templates/config/', /.+\.json/u));

  const escapedName = escapeStringRegexp(pkg['lsd:module'] as string);
  const regex = new RegExp(`(${escapedName}/)${/\^\d+\.\d+\.\d+/u.source}`, 'gmu');

  for (const config of configs) {
    await replaceComponentVersion(config, regex, `${major}.0.0`);
  }
  await replaceComponentVersion('package.json', regex, `${major}.0.0`);

  // eslint-disable-next-line ts/naming-convention
  await simpleGit().commit(`chore(release): Update configs to v${major}.0.0`, configs, { '--no-verify': null });
}

/**
 * Ends the process and writes out an error in case something goes wrong.
 */
function endProcess(error: Error): never {
  console.error(error);
  process.exit(1);
}

upgradeConfig().catch(endProcess);
