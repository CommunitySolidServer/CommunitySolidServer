#!/usr/bin/env ts-node
/* eslint-disable import/extensions, no-console */
import * as readline from 'node:readline';
import simpleGit from 'simple-git';
import { version } from '../package.json';

/**
 * Script: upgradeConfigs.ts
 * Run with: ts-node scripts/upgradeConfig.ts
 * ------------------------------------------
 * Amend the previous commit with changes to the changelog
 * Then tag and push it. This script is run after
 * `npx commit-and-tag-version`
 */

/**
 * Amends the previous commit, creates the annotated release tag
 * and then pushes commit and tag.
 */
async function commitAndTag(): Promise<void> {
  // eslint-disable-next-line ts/naming-convention
  await simpleGit().commit([], 'CHANGELOG.md', { '--amend': null, '--no-edit': null, '--no-verify': null });
  await simpleGit().addAnnotatedTag(`v${version}`, `Release Version ${version}`);
  // eslint-disable-next-line ts/naming-convention
  await simpleGit().push({ '--follow-tags': null });
}

/**
 * Prompts the user for input
 *
 * @param query - A string to prompt the user
 *
 * @returns Promise with the input of the user
 */
async function waitForUserInput(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve): void => rl.question(query, (answer): void => {
    rl.close();
    resolve(answer);
  }));
}

/**
 * Halts the script, waiting for user input before
 * committing the changelog changes, adding an
 * annotated tag and pushing the changes to origin.
 */
async function finalizeRelease(): Promise<void> {
  await waitForUserInput('Manually edit CHANGELOG.md, press any key to finalize...');
  return commitAndTag();
}

/**
 * Ends the process and writes out an error in case something goes wrong.
 */
function endProcess(error: Error): never {
  console.error(error);
  process.exit(1);
}

finalizeRelease()
  .then((): void => console.info(`Changes and tag v${version} pushed to origin.`))
  .catch(endProcess);
