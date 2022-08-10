#!/usr/bin/env ts-node
/* eslint-disable no-console */
import * as readline from 'readline';
import type { PushResult } from 'simple-git';
import simpleGit from 'simple-git';
import version from '../package.json';

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
async function commitAndTag(): Promise<PushResult> {
  await simpleGit().commit([], 'CHANGELOG.md', { '--amend': null, '--no-edit': null, '--no-verify': null });
  await simpleGit().addAnnotatedTag(`testing-${version.version}`, `Release Version ${version.version}`);
  return await simpleGit().push({ '--follow-tags': null });
}

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

async function finalizeRelease(): Promise<void> {
  await waitForUserInput('Manually edit CHANGELOG.md, press any key to finalize...');
  await commitAndTag();
}

/**
 * Ends the process and writes out an error in case something goes wrong.
 */
function endProcess(error: Error): never {
  console.error(error);
  process.exit(1);
}

finalizeRelease().catch(endProcess);
