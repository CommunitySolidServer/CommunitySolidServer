import { promises as fs } from 'fs';
import { RUNTIMECONFIG } from './configs/Util';

module.exports = async function(): Promise<void> {
  // Remove copied test files
  await fs.rmdir(RUNTIMECONFIG.rootFilepath, { recursive: true });
};
