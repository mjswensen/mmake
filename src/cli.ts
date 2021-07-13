#!/usr/bin/env node

import { invoke } from './api';
import { access } from 'fs/promises';
import { join } from 'path';

if (require.main === module) {
  (async function main() {
    const ruleFileOptions = ['mmakefile.mjs', 'Mmakefile'];
    let rulesLoaded = false;
    for (const ruleFile of ruleFileOptions) {
      try {
        const path = join(__dirname, ruleFile);
        await access(path);
        await import(path);
        rulesLoaded = true;
        break;
      } catch {}
    }
    if (!rulesLoaded) {
      console.error(
        `Unable to find rule file (tried ${ruleFileOptions.join(', ')})`,
      );
      process.exit(1);
    }
    for (const requisite of process.argv.slice(2)) {
      await invoke(requisite);
    }
  })();
}
