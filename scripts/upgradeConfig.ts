#!/usr/bin/env node
/* eslint-disable no-console */
import { readdir, readFile, writeFile } from 'fs-extra';
import simpleGit from 'simple-git';

/**
 * Script: upgradeConfigs.ts
 * Run with: ts-node scripts/upgradeConfig.ts
 * ------------------------------------------
 * Upgrades the references to \@solid/community-server in
 * package.json (lsd prefix) and all JSON-LD config files.
 * This script is run alongside standard-version
 * after the version bump is done in package.json but before the
 * release has been committed.
 */

/**
 * Helper function to escape search strings for use in Regular Expressions
 * @param  string - the search string to be escaped
 * @returns Promise with the escaped string
 */
async function escapeString(string: string): Promise<string> {
  return string.replace(/[$()*+.?[\\\]^{|}]/gu, '\\$&');
}

interface NpmPackage {
  version: string;
  name: string;
}
/**
 * Reads and return the package.json file to extract version and name
 * @returns Promise with the NpmPackage
 */
async function getNpmPackage(): Promise<NpmPackage> {
  return JSON.parse(await readFile('package.json', 'utf8'));
}
/**
 * Search and replace the version of a component with given name
 * @param  filePath - File to search/replace
 * @param  name - Component name
 * @param  version - Semantic version to change to
 */
async function replaceComponentVersion(filePath: string, name: string, version: string): Promise<void> {
  console.log(`Replacing version in ${filePath}`);
  const data = await readFile(filePath, 'utf8');
  const escapedName = await escapeString(name);
  const regex = new RegExp(`(${escapedName}\\/)\\^\\d+\\.\\d+\\.\\d+`, 'gmu');
  const result = data.replace(regex, `$1^${version}`);
  return writeFile(filePath, result, 'utf8');
}
/**
 * Recursive search for files that match a given Regex
 * @param  path - Path of folder to start search in
 * @param  regex - A regular expression to which file names will be matched
 * @returns Promise with all file pathss
 */
async function getFilePaths(path: string, regex: RegExp): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });

  const files = entries
    .filter((file): boolean => !file.isDirectory())
    .filter((file): boolean => regex.test(file.name))
    .map((file): string => `${path}${file.name}`);

  const folders = entries.filter((folder): boolean => folder.isDirectory());

  for (const folder of folders) {
    files.push(...await getFilePaths(`${path}${folder.name}/`, regex));
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
  const npmPackage = await getNpmPackage();
  const major = npmPackage.version.split('.')[0];

  console.log(`Changing @solid/community-server references to ${major}.0.0\n`);

  const configs = await getFilePaths('config/', /.+\.json/u);

  for (const config of configs) {
    await replaceComponentVersion(config, npmPackage.name, `${major}.0.0`);
  }
  await replaceComponentVersion('package.json', npmPackage.name, `${major}.0.0`);

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
