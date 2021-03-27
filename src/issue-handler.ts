import * as core from '@actions/core';
import * as github from '@actions/github';
import {Context} from '@actions/github/lib/context';
import {inspect} from 'util';
import jexl from 'jexl';

/**
 * Main handle function which takes a json config, processes it
 * and then calls various actions in it.
 */
export async function handleIssue(token: string, config: string): Promise<void> {
  core.debug(`github context: ${inspect(github.context, true, 10)}`);
  const configs = getHandlerConfigFromJson(config);

  // const j = new jexl.Jexl();
  const expressionContext: ExpressionContext = {
    context: github.context,
    title: github.context.payload.issue?.title,
    body: github.context.payload.issue?.body || '',
    number: github.context.issue.number
  };
  addJexlFunctions(token);

  for (const action of configs.actions) {
    switch (action.type) {
      case ActionType.ifThen:
        await handleIfThen(action, expressionContext);
        break;
      case ActionType.ifIfelseThen:
        await handleIfIfelseThen(action, expressionContext);
        break;
      default:
        break;
    }
  }
}

/**
 * Handling logic of 'ifThen'.
 */
export async function handleIfThen(action: IfThen, expressionContext: ExpressionContext): Promise<void> {
  core.debug(`handleIfThen ${inspect(action)}`);
  const ret = await jexl.eval(action.if, expressionContext);
  const evaluate = ret === true;
  if (evaluate) {
    await jexl.eval(action.then, expressionContext);
  }
}

/**
 * Handling logic of 'ifIfelseThen'.
 */
export async function handleIfIfelseThen(action: IfElseThen, expressionContext: ExpressionContext): Promise<void> {
  core.debug(`handleIfIfelseThen ${inspect(action)}`);
  await jexl.eval(action.if, {});
  await jexl.eval(action.elseif, {});
  await jexl.eval(action.then, {});
}

/**
 *
 */
function addJexlFunctions(token: string): void {
  jexl.addFunction('createIssue', async (title: string, body: string) => {
    // core.debug(`hi from createIssue()`);
    await createIssue(token, github.context.repo.owner, github.context.repo.repo, title, body);
  });

  jexl.addFunction('hasLabels', (labels: string[]) => {
    // core.debug(`hi from hasLabels() ${inspect(labels)}`);
    const payloadLabelObjects = github.context.payload.issue?.labels as {name: string}[];
    if (payloadLabelObjects) {
      const existingLabels = payloadLabelObjects.map(l => l.name);
      const check = labels.every(el => {
        return existingLabels.indexOf(el) !== -1;
      });
      return check;
    }
    return false;
  });
}

/**
 * Parses raw config json into {@ IssueHandlerConfig}.
 */
function getHandlerConfigFromJson(json: string): IssueHandlerConfig {
  const jsonConfig: IssueHandlerConfig = JSON.parse(json);
  core.debug(`JSON config: ${inspect(jsonConfig)}`);
  return jsonConfig;
}

/**
 * Create a new GitHub issue.
 */
async function createIssue(token: string, owner: string, repo: string, title: string, body: string) {
  core.info(`Creating issue ${owner} ${repo} ${title} ${body}`);
  const octokit = github.getOctokit(token);
  await octokit.request('POST /repos/{owner}/{repo}/issues', {
    owner: owner,
    repo: repo,
    title: title,
    body: body
  });
}

interface IssueHandlerConfig {
  actions: Action[];
}

enum ActionType {
  ifThen = 'ifThen',
  ifIfelseThen = 'ifIfelseThen'
}

interface IfThen {
  if: string;
  then: string;
}

interface IfElseThen {
  if: string;
  elseif: string;
  then: string;
}

type Action = ({type: ActionType.ifThen} & IfThen) | ({type: ActionType.ifIfelseThen} & IfElseThen);

interface ExpressionContext {
  context: Context;
  title: string;
  body: string;
  number: number;
}
