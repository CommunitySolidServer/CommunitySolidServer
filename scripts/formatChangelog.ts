#!/usr/bin/env node
/* eslint-disable no-console */
import { readFile, writeFile } from 'fs-extra';

/**
 * Script called after the changelog changes of standard-version
 * This script can be extended to add further custom formatting
 * to the changelog.
 * Current automatic changes:
 *  - Change all version titles to H2 ( ### [vX.Y.Z] => ## [vX.Y.Z])
 */

/**
 * @param from  - Regular expression to search for
 * @param to    - String to replace to
 * @param filePath - File to search/replace
 * @returns Promise
 */
async function replaceInFile(from: RegExp, to: string, filePath: string): Promise<void> {
  const data = await readFile(filePath, 'utf8');
  const result = data.replace(from, to);
  return writeFile(filePath, result, 'utf8');
}

/**
 * Ends the process and writes out an error in case something goes wrong.
 */
function endProcess(error: Error): never {
  console.error(error);
  process.exit(1);
}

replaceInFile(/### \[/gu, '## [', 'CHANGELOG.md').catch(endProcess);
