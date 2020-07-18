import * as core from '@actions/core';
import {checkCommands} from './ensure-commands';
import {splitStringToArray} from './utils';

async function run() {
  try {
    const ensureCommands = core.getInput('ensure-commands', {required: false});
    if (ensureCommands) {
      await checkCommands(splitStringToArray(ensureCommands));
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
