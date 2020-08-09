import * as core from '@actions/core';
import * as github from '@actions/github';
import jexl from 'jexl';
import {inspect} from 'util';

export async function handle(token: string, config: string, max: number): Promise<void> {
  core.debug(`github context: ${inspect(github.context, true, 10)}`);

  const context = getCurrentContext();
  const data = getCurrentData();
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
    } else if (matchConfig.action === HandlerConfigAction.fail) {
      let message = matchConfig?.fail?.message || 'Unknown error';
      if (data.message) {
        message = message.concat('; ', data.message);
      }
      throw new Error(message);
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
  const context = getCurrentContext();
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

function getCurrentContext(): ClientPayloadContext {
  if (github.context.payload.client_payload && github.context.payload.client_payload.build_zoo_handler_context) {
    return github.context.payload.client_payload.build_zoo_handler_context;
  } else {
    return {handler_count: 0, properties: {}};
  }
}

function getCurrentData(): ClientPayloadData {
  if (github.context.payload.client_payload && github.context.payload.client_payload.build_zoo_handler_data) {
    return github.context.payload.client_payload.build_zoo_handler_data;
  } else {
    return {};
  }
}

export interface ClientPayloadContext {
  handler_count: number;
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
  fail = 'fail'
}

interface HandlerConfigRepositoryDispatch {
  owner: string;
  repo: string;
  event_type: string;
}

interface HandlerConfigFail {
  message: string;
}

interface HandlerConfig {
  if: string;
  action: HandlerConfigAction;
  repository_dispatch?: HandlerConfigRepositoryDispatch;
  fail?: HandlerConfigFail;
}

export function getHandlerConfigsFromJson(json: string): HandlerConfig[] {
  const jsonConfig: HandlerConfig[] = JSON.parse(json);
  core.debug(`JSON config: ${inspect(jsonConfig)}`);
  return jsonConfig;
}
