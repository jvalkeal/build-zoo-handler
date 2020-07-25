import * as core from '@actions/core';
import {checkCommands} from './ensure-commands';
import {checkEnv} from './ensure-env';
import {splitStringToArray} from './utils';
import {tagRelease} from './tag-release';

async function run() {
  try {
    // ensure commands
    const ensureCommands = core.getInput('ensure-commands', {required: false});
    if (ensureCommands) {
      await checkCommands(splitStringToArray(ensureCommands));
    }

    // ensure environment variables
    const ensureEnv = core.getInput('ensure-env', {required: false});
    if (ensureEnv) {
      await checkEnv(splitStringToArray(ensureEnv));
    }

    // tag release
    const username = core.getInput('tag-release-username', {required: false});
    const useremail = core.getInput('tag-release-useremail', {required: false});
    const branch = core.getInput('tag-release-branch', {required: false});
    const tag = core.getInput('tag-release-tag', {required: false});
    if (username && useremail && branch && tag) {
      await tagRelease(username, useremail, branch, tag);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
