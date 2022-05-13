#!/usr/bin/env node
/* eslint-disable no-console */
import { readFile, writeFile } from 'fs-extra';

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
