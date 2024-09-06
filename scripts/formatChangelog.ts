#!/usr/bin/env ts-node

/* eslint-disable no-console */
import { readFile, writeFile } from 'fs-extra';

/**
 * Script called after the changelog changes of standard-version
 * This script can be extended to add further custom formatting
 * to the changelog.
 * Current automatic changes:
 *  - Change all version titles to H2 ("### [vX.Y.Z]" to "## [vX.Y.Z]")
 *  - Capitalize all list entries
 */

/**
 * Capitalize all list entries
 *
 * @param input - String to search/replace
 *
 * @returns Promise with output string
 */
async function capitalizeListEntries(input: string): Promise<string> {
  return input.replaceAll(/^\W*\* [a-z]/gmu, (match): string => match.toUpperCase());
}

/**
 * Ends the process and writes out an error in case something goes wrong.
 */
function endProcess(error: Error): never {
  console.error(error);
  process.exit(1);
}

/**
 * Main function for changelog formatting
 *
 * @param filePath - Path to the changelog file
 *
 * @returns Promise
 */
async function formatChangelog(filePath: string): Promise<void> {
  let changelog = await readFile(filePath, 'utf8');
  changelog = await capitalizeListEntries(changelog);
  return writeFile(filePath, changelog, 'utf8');
}

formatChangelog('CHANGELOG.md').catch(endProcess);
