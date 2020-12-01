#!/usr/bin/env node
import * as Path from 'path';
import { runCli } from '../src/init/CliRunner';
runCli(Path.join(__dirname, '..'), process.argv);
