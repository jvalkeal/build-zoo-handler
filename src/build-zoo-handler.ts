import * as core from '@actions/core';
import {checkCommands} from './ensure-commands';
import {checkEnv} from './ensure-env';
import {splitStringToArray} from './utils';

async function run() {
  try {
    const ensureCommands = core.getInput('ensure-commands', {required: false});
    if (ensureCommands) {
      await checkCommands(splitStringToArray(ensureCommands));
    }
    const ensureEnv = core.getInput('ensure-env', {required: false});
    if (ensureEnv) {
      await checkEnv(splitStringToArray(ensureEnv));
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
