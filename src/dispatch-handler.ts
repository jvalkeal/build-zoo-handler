import * as core from '@actions/core';
import * as github from '@actions/github';
import jexl from 'jexl';
import {inspect} from 'util';

export async function handle(token: string, config: string, max: number): Promise<void> {
  core.debug(`github context: ${inspect(github.context, true, 10)}`);

  const clientPayload = getCurrentClientPayload();
  const context = clientPayload.build_zoo_handler_context;
  const data = clientPayload.build_zoo_handler_data;
  core.info(`Current zoo context:\n ${inspect(context, true, 10)}`);
  core.debug(`data: ${inspect(data)}`);

  if (context.handler_count && context.handler_count > max) {
    throw new Error(`Max handler count ${max} reached, do you have a dispatch loop?`);
  }

  const configs = getHandlerConfigsFromJson(config);
  core.debug(`configs: ${inspect(configs)}`);
  let matchConfig: HandlerConfig | undefined;
  const expressionContext: ExpressionContext = {
    initial: context.handler_count === 0,
    context: context,
    data: data
  };
  for (const config of configs) {
    core.debug(`config: ${inspect(config, true, 10)}`);
    if (config.if) {
      const evalResult = await evaluate(config.if, expressionContext);
      core.debug(`config evalResult: ${evalResult}`);
      if (evalResult === true) {
        matchConfig = config;
      }
    }
  }
  core.debug(`matchConfig: ${inspect(matchConfig, true, 10)}`);

  const p: ClientPayload = {
    build_zoo_handler_context: {
      handler_count: context.handler_count + 1,
      controller_owner: context.controller_owner,
      controller_repo: context.controller_repo,
      controller_workflow: context.controller_workflow,
      controller_ref: context.controller_ref,
      properties: {...context.properties, ...data.properties}
    },
    build_zoo_handler_data: {}
  };

  core.info(`New zoo context:\n ${inspect(p.build_zoo_handler_context, true, 10)}`);

  if (matchConfig) {
    core.info(`Match config to use for dispatch\n ${inspect(matchConfig, true, 10)}`);
    if (matchConfig.action === HandlerConfigAction.repository_dispatch && matchConfig.repository_dispatch) {
      await sendRepositoryDispatch(
        token,
        matchConfig.repository_dispatch?.owner,
        matchConfig.repository_dispatch.repo,
        matchConfig.repository_dispatch.event_type,
        p
      );
    } else if (matchConfig.action === HandlerConfigAction.workflow_dispatch && matchConfig.workflow_dispatch) {
      await sendWorkflowDispatch(
        token,
        matchConfig.workflow_dispatch.owner,
        matchConfig.workflow_dispatch.repo,
        matchConfig.workflow_dispatch.workflow,
        matchConfig.workflow_dispatch.ref,
        {
          'build-zoo-handler': new Buffer(JSON.stringify(p)).toString('base64')
        }
      );
    } else if (matchConfig.action === HandlerConfigAction.fail) {
      let message = matchConfig?.fail?.message || 'Unknown error';
      if (data.message) {
        message = message.concat('; ', data.message);
      }
      throw new Error(message);
    } else {
      throw new Error('Found config but no work to do');
    }
  } else {
    core.info('Nothing to do, bye bye');
  }
}

async function evaluate(expression: string, context: ExpressionContext): Promise<boolean> {
  core.debug(`evaluating: expr ${expression} context ${inspect(context, true, 10)}`);
  try {
    const ret = await jexl.eval(expression, context);
    core.debug(`evaluation result ${ret}`);
    return ret === true;
  } catch (error) {}
  return false;
}

export async function handleRepositoryDispatch(
  token: string,
  owner: string,
  repo: string,
  eventType: string,
  clientPayloadData: ClientPayloadData
) {
  if (clientPayloadData.owner === undefined && github.context.payload.repository) {
    clientPayloadData.owner = github.context.payload.repository.owner.login;
  }
  if (clientPayloadData.repo === undefined && github.context.payload.repository) {
    clientPayloadData.repo = github.context.payload.repository.name;
  }
  if (clientPayloadData.properties === undefined) {
    clientPayloadData.properties = {};
  }
  const props = readContextProperties();
  for (const key in props) {
    clientPayloadData.properties[key] = props[key];
  }
  const context = getCurrentClientPayload().build_zoo_handler_context;
  core.info(`Current zoo context:\n ${inspect(context, true, 10)}`);
  core.info('Prepare to send repository dispatch');
  core.debug(`github context: ${inspect(github.context, true, 10)}`);
  const p: ClientPayload = {
    build_zoo_handler_context: {
      handler_count: context.handler_count + 1,
      properties: context.properties
    },
    build_zoo_handler_data: clientPayloadData
  };
  await sendRepositoryDispatch(token, owner, repo, eventType, p);
  core.info('Repository dispatch sent successfully');
}

export async function sendRepositoryDispatch(
  token: string,
  owner: string,
  repo: string,
  eventType: string,
  clientPayload: any
) {
  core.info(
    `Repository dispatch owner=${owner} repo=${repo} event_type=${eventType} payload=\n${inspect(
      clientPayload,
      true,
      10
    )}`
  );
  core.debug(`Sending repository dispatch ${owner} ${repo} ${eventType} ${inspect(clientPayload, true, 10)}`);
  const octokit = github.getOctokit(token);
  await octokit.repos.createDispatchEvent({
    owner: owner,
    repo: repo,
    event_type: eventType,
    client_payload: clientPayload
  });
}

export async function handleWorkflowDispatch(
  token: string,
  owner: string|undefined,
  repo: string|undefined,
  clientPayloadData: ClientPayloadData,
  workflow: string|undefined,
  ref: string|undefined
) {
  if (clientPayloadData.owner === undefined && github.context.payload.repository) {
    clientPayloadData.owner = github.context.payload.repository.owner.login;
  }
  if (clientPayloadData.repo === undefined && github.context.payload.repository) {
    clientPayloadData.repo = github.context.payload.repository.name;
  }
  if (clientPayloadData.properties === undefined) {
    clientPayloadData.properties = {};
  }
  const props = readContextProperties();
  for (const key in props) {
    clientPayloadData.properties[key] = props[key];
  }

  const context = getCurrentClientPayload().build_zoo_handler_context;
  core.info(`Current zoo context:\n ${inspect(context, true, 10)}`);
  core.info('Prepare to send workflow dispatch');
  core.debug(`github context: ${inspect(github.context, true, 10)}`);

  owner = owner || context.controller_owner;
  repo = repo || context.controller_repo;
  workflow = workflow || context.controller_workflow;
  ref = ref || context.controller_ref;
  if (!owner || !repo || !workflow || !ref) {
    throw new Error(`All these must be set, owner=${owner}, repo=${repo}, workflow=${workflow} and ref=${ref}`);
  }

  let inputs: {[key: string]: string} = {};
  const clientPayload: ClientPayload = {
    build_zoo_handler_context: context,
    build_zoo_handler_data: clientPayloadData
  };
  inputs['build-zoo-handler'] = new Buffer(JSON.stringify(clientPayload)).toString('base64');

  await sendWorkflowDispatch(token, owner, repo, workflow, ref, inputs);
  core.info('Workflow dispatch sent successfully');
}

export async function sendWorkflowDispatch(
  token: string,
  owner: string,
  repo: string,
  workflow: string,
  ref: string,
  inputs: {[key: string]: string}
) {
  core.debug(`Sending workflow dispatch ${owner} ${repo} ${workflow} ${ref} ${inspect(inputs, true, 10)}`);
  const octokit = github.getOctokit(token);
  await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
    owner: owner,
    repo: repo,
    workflow_id: workflow,
    ref: ref,
    inputs: inputs
  });
}

export async function extractContextProperties(): Promise<void> {
  let count = 0;
  try {
    const props = github.context.payload.client_payload.build_zoo_handler_context.properties as {[key: string]: string};
    for (let key in props) {
      const value = props[key];
      core.exportVariable(`BUILD_ZOO_HANDLER_${key}`, value);
      core.debug(`Extract context property ${key} ${value}`);
      count++;
    }
  } catch (error) {
    // if it fails, we probably don't have context
    core.debug(`Error extracting context properties ${error}`);
  }
  core.info(`Extracted ${count} properties`);
}

function getHandlerConfigsFromJson(json: string): HandlerConfig[] {
  const jsonConfig: HandlerConfig[] = JSON.parse(json);
  core.debug(`JSON config: ${inspect(jsonConfig)}`);
  return jsonConfig;
}

const TOKEN_PREFIX: RegExp = /^BUILD_ZOO_HANDLER.*$/;

function readContextProperties(): {[key: string]: string} {
  const props: {[key: string]: string} = {};
  Object.keys(process.env)
    .filter(env => env.match(TOKEN_PREFIX))
    .forEach(env => {
      const key = env.replace('BUILD_ZOO_HANDLER_', '');
      const value = process.env[env] || '';
      props[key] = value;
    });
  return props;
}

function getCurrentClientPayload(): ClientPayload {
  if (github.context.eventName === 'workflow_dispatch' && github.context.payload.inputs) {
    const zooInput: string = github.context.payload.inputs['build-zoo-handler'];
    if (zooInput) {
      const payloadJson = new Buffer(zooInput, 'base64').toString('ascii');
      const clientPayload = JSON.parse(payloadJson);
      return clientPayload;
    }
  } else if (github.context.eventName === 'repository_dispatch') {
    return github.context.payload.client_payload;
  }

  return {
    build_zoo_handler_context: {
      handler_count: 0,
      controller_owner: github.context.repo.owner,
      controller_repo: github.context.repo.repo,
      controller_workflow: github.context.workflow,
      controller_ref: github.context.ref,
      properties: {}
    },
    build_zoo_handler_data: {}
  };
}

export interface ClientPayloadContext {
  handler_count: number;
  controller_owner?: string;
  controller_repo?: string;
  controller_workflow?: string;
  controller_ref?: string;
  properties: {[key: string]: string};
}

export interface ClientPayloadData {
  event?: string;
  owner?: string;
  repo?: string;
  message?: string;
  [key: string]: any;
  properties?: {[key: string]: string};
}

export interface ClientPayload {
  build_zoo_handler_context: ClientPayloadContext;
  build_zoo_handler_data: ClientPayloadData;
}

export interface ExpressionContext {
  initial: boolean;
  context: ClientPayloadContext;
  data: ClientPayloadData;
}

enum HandlerConfigAction {
  repository_dispatch = 'repository_dispatch',
  workflow_dispatch = 'workflow_dispatch',
  fail = 'fail'
}

interface HandlerConfigRepositoryDispatch {
  owner: string;
  repo: string;
  event_type: string;
}

interface HandlerConfigWorkflowDispatch {
  owner: string;
  repo: string;
  ref: string;
  workflow: string;
}

interface HandlerConfigFail {
  message: string;
}

interface HandlerConfig {
  if: string;
  action: HandlerConfigAction;
  repository_dispatch?: HandlerConfigRepositoryDispatch;
  workflow_dispatch?: HandlerConfigWorkflowDispatch;
  fail?: HandlerConfigFail;
}
