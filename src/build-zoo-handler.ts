import * as core from '@actions/core';
import {inspect} from 'util';
import {checkCommands} from './ensure-commands';
import {checkEnv} from './ensure-env';
import {tagRelease} from './tag-release';
import {commitChanges} from './commit-changes';
import {getPackCli} from './pack';
import {
  handle,
  handleRepositoryDispatch,
  handleWorkflowDispatch,
  ClientPayloadData,
  extractContextProperties
} from './dispatch-handler';
import {splitStringToArray} from './utils';

const DEFAULT_USERNAME = 'github-actions[bot]';
const DEFAULT_USEREMAIL = '41898282+github-actions[bot]@users.noreply.github.com';

async function run() {
  try {
    // ensure commands
    const ensureCommands = core.getInput('ensure-commands', {required: false});
    if (ensureCommands) {
      core.startGroup('Ensure Commands Feature');
      await checkCommands(splitStringToArray(ensureCommands));
      core.endGroup();
    }

    // we want to run this zoo feature before ensure env
    const dispatchHandlerExtractContextProperties = Boolean(
      inputNotRequired('dispatch-handler-extract-context-properties')
    );
    if (dispatchHandlerExtractContextProperties) {
      core.startGroup('Dispatch Handler Feature - Extract Context Properties');
      await extractContextProperties();
      core.endGroup();
    }

    // ensure environment variables
    const ensureEnv = core.getInput('ensure-env', {required: false});
    if (ensureEnv) {
      core.startGroup('Ensure Env Feature');
      await checkEnv(splitStringToArray(ensureEnv));
      core.endGroup();
    }

    // tag release
    const username = core.getInput('tag-release-username', {required: false}) || DEFAULT_USERNAME;
    const useremail = core.getInput('tag-release-useremail', {required: false}) || DEFAULT_USEREMAIL;
    const branch = core.getInput('tag-release-branch', {required: false});
    const tag = core.getInput('tag-release-tag', {required: false}) || branch;
    const tagPrefix = core.getInput('tag-release-tag-prefix', {required: false}) || 'v';
    if (branch && tag) {
      core.startGroup('Tag Release Feature');
      await tagRelease(username, useremail, branch, tag, tagPrefix);
      core.endGroup();
    }

    // commit changes
    const commitUsername = core.getInput('commit-changes-username', {required: false}) || DEFAULT_USERNAME;
    const commitUseremail = core.getInput('commit-changes-useremail', {required: false}) || DEFAULT_USEREMAIL;
    const commitBranch = core.getInput('commit-changes-branch', {
      required: false
    });
    const commitMessage = core.getInput('commit-changes-message', {
      required: false
    });
    if (commitBranch && commitMessage) {
      core.startGroup('Commit Changes Feature');
      await commitChanges(commitUsername, commitUseremail, commitBranch, commitMessage);
      core.endGroup();
    }

    // pack cli
    const packVersion = core.getInput('pack-version', {required: false});
    if (packVersion) {
      core.startGroup('Pack Feature');
      await getPackCli(packVersion);
      core.endGroup();
    }

    // dispatch handler
    const dispatchHandlerToken = inputNotRequired('dispatch-handler-token');
    const dispatchHandlerOwner = inputNotRequired('dispatch-handler-owner');
    const dispatchHandlerRepo = inputNotRequired('dispatch-handler-repo');
    const dispatchHandlerEventType = inputNotRequired('dispatch-handler-event-type');
    const dispatchHandlerConfig = inputNotRequired('dispatch-handler-config');
    const dispatchHandlerMax = Number(inputNotRequired('dispatch-handler-max') || '10');
    const dispatchHandlerClientPayloadData = inputNotRequired('dispatch-handler-client-payload-data');
    const dispatchHandlerWorkflow = inputNotRequired('dispatch-handler-workflow');
    const dispatchHandlerRef = inputNotRequired('dispatch-handler-ref');

    if (dispatchHandlerToken) {
      if (dispatchHandlerConfig) {
        core.startGroup('Dispatch Handler Feature - Handle');
        await handle(dispatchHandlerToken, dispatchHandlerConfig, dispatchHandlerMax);
        core.endGroup();
      } else if (dispatchHandlerEventType) {
        core.startGroup('Dispatch Handler Feature - Dispatch Repository');
        const clientPayloadData: ClientPayloadData = JSON.parse(dispatchHandlerClientPayloadData);
        await handleRepositoryDispatch(
          dispatchHandlerToken,
          dispatchHandlerOwner,
          dispatchHandlerRepo,
          dispatchHandlerEventType,
          clientPayloadData
        );
        core.endGroup();
      } else {
        core.startGroup('Dispatch Handler Feature - Dispatch Workflow');
        const clientPayloadData: ClientPayloadData = JSON.parse(dispatchHandlerClientPayloadData);
        await handleWorkflowDispatch(
          dispatchHandlerToken,
          dispatchHandlerOwner,
          dispatchHandlerRepo,
          clientPayloadData,
          dispatchHandlerWorkflow,
          dispatchHandlerRef
        );
        core.endGroup();
      }
    }
  } catch (error) {
    core.debug(inspect(error));
    core.setFailed(error.message);
  }
}

function inputNotRequired(id: string): string {
  return core.getInput(id, {required: false});
}

run();
