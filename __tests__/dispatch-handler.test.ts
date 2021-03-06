import nock from 'nock';
import lodash from 'lodash';
import * as core from '@actions/core';
import * as github from '@actions/github';
import * as dispatchHandler from '../src/dispatch-handler';

const originalGitHubWorkspace = process.env['GITHUB_WORKSPACE'];
const originalGitHubRepository = process.env['GITHUB_REPOSITORY'];
let originalContext = {...github.context};
let inputs = {} as any;

describe('workflow dispatch handler tests', () => {
  beforeAll(async () => {
    jest.spyOn(core, 'getInput').mockImplementation((name: string) => {
      return inputs[name];
    });
  }, 300000);

  beforeEach(() => {
    inputs = {};
    nock.cleanAll();
  });

  afterAll(async () => {
    delete process.env['GITHUB_WORKSPACE'];
    if (originalGitHubWorkspace) {
      process.env['GITHUB_WORKSPACE'] = originalGitHubWorkspace;
    }
    delete process.env['GITHUB_REPOSITORY'];
    if (originalGitHubRepository) {
      process.env['GITHUB_REPOSITORY'] = originalGitHubRepository;
    }

    github.context.ref = originalContext.ref;
    github.context.sha = originalContext.sha;

    jest.restoreAllMocks();
  }, 100000);

  it('Repository Dispatch posts request from params', async () => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';
    nock('https://api.github.com')
      .persist()
      .post('/repos/owner/repo/dispatches', body => {
        return (
          body.event_type === 'eventType' &&
          body.client_payload.build_zoo_handler_context.handler_count === 1 &&
          body.client_payload.build_zoo_handler_data.properties
        );
      })
      .reply(204);
    await dispatchHandler.handleRepositoryDispatch('token', 'owner', 'repo', 'eventType', {});
  }, 100000);

  xit('Repository Dispatch posts request from env', async () => {
    // handleRepositoryDispatch only reads what controller passed in
    // so on its own it can't rely on env
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';
    nock('https://api.github.com')
      .persist()
      .post('/repos/owner/repo/dispatches', body => {
        return (
          body.event_type === 'eventType' &&
          body.client_payload.build_zoo_handler_context.handler_count === 1 &&
          body.client_payload.build_zoo_handler_context.controller_owner === 'owner' &&
          body.client_payload.build_zoo_handler_context.controller_repo === 'repo' &&
          body.client_payload.build_zoo_handler_data.properties
        );
      })
      .reply(204);
    await dispatchHandler.handleRepositoryDispatch('token', undefined, undefined, 'eventType', {});
  }, 100000);

  it('Workflow Dispatch posts request from params', async () => {
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';
    nock('https://api.github.com')
      .persist()
      .post('/repos/owner/repo/actions/workflows/workflow/dispatches', body => {
        return body.ref === 'ref' && body.inputs['build-zoo-handler'];
      })
      .reply(204);
    await dispatchHandler.handleWorkflowDispatch('token', 'owner', 'repo', {}, 'workflow', 'ref');
  }, 100000);

  it('Workflow Dispatch posts request from env', async () => {
    github.context.ref = 'ref';
    github.context.payload.workflow = 'workflow';
    github.context.eventName = 'workflow_dispatch';
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';
    nock('https://api.github.com')
      .persist()
      .post('/repos/owner/repo/actions/workflows/workflow/dispatches', body => {
        const zooInput: string = body.inputs['build-zoo-handler'];
        const payloadJson = Buffer.from(zooInput, 'base64').toString('ascii');
        const clientPayload = JSON.parse(payloadJson);
        return lodash.isMatch(clientPayload, {
          build_zoo_handler_context: {
            handler_count: 0,
            controller_owner: 'owner',
            controller_repo: 'repo',
            controller_workflow: 'workflow',
            controller_ref: 'ref'
          }
        });
      })
      .reply(204);
    await dispatchHandler.handleWorkflowDispatch('token', undefined, undefined, {}, undefined, undefined);
  }, 100000);

  it('Handle sets context', async () => {
    github.context.ref = 'ref';
    github.context.payload.workflow = 'workflow';
    github.context.eventName = 'workflow_dispatch';
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';
    nock('https://api.github.com')
      .persist()
      .post('/repos/owner/repo/actions/workflows/workflow/dispatches', body => {
        const zooInput: string = body.inputs['build-zoo-handler'];
        const payloadJson = Buffer.from(zooInput, 'base64').toString('ascii');
        const clientPayload = JSON.parse(payloadJson);
        return lodash.isMatch(clientPayload, {
          build_zoo_handler_context: {
            handler_count: 1,
            controller_owner: 'owner',
            controller_repo: 'repo',
            controller_workflow: 'workflow',
            controller_ref: 'ref'
          }
        });
      })
      .reply(204);
    const config = JSON.stringify([
      {
        if: 'initial == true',
        action: 'workflow_dispatch',
        workflow_dispatch: {
          owner: 'owner',
          repo: 'repo',
          workflow: 'workflow',
          ref: 'ref'
        }
      }
    ]);
    await dispatchHandler.handle('token', config, 10);
  }, 100000);

  it('Extract context properties with repository dispatch', async () => {
    github.context.eventName = 'repository_dispatch';
    github.context.payload.client_payload = {};
    github.context.payload.client_payload.build_zoo_handler_context = {};
    github.context.payload.client_payload.build_zoo_handler_context.properties = {
      prop1: 'value1',
      prop2: 'value2'
    };
    await dispatchHandler.extractContextProperties();
    expect(process.env['BUILD_ZOO_HANDLER_prop1']).toBe('value1');
    expect(process.env['BUILD_ZOO_HANDLER_prop2']).toBe('value2');
  }, 100000);

  it('Extract context properties with workflow dispatch', async () => {
    const clientPayload: dispatchHandler.ClientPayload = {
      build_zoo_handler_context: {
        handler_count: 0,
        properties: {
          prop3: 'value3',
          prop4: 'value4'
        }
      },
      build_zoo_handler_data: {}
    };
    inputs['build-zoo-handler'] = Buffer.from(JSON.stringify(clientPayload)).toString('base64');
    github.context.payload.inputs = inputs;
    github.context.eventName = 'workflow_dispatch';
    await dispatchHandler.extractContextProperties();
    expect(process.env['BUILD_ZOO_HANDLER_prop3']).toBe('value3');
    expect(process.env['BUILD_ZOO_HANDLER_prop4']).toBe('value4');
  }, 100000);

  it('Handle sets initial context properties', async () => {
    inputs['build-zoo-handler-properties'] = 'prop1=value1,prop2=value2';
    github.context.payload.inputs = inputs;

    github.context.ref = 'ref';
    github.context.payload.workflow = 'workflow';
    github.context.eventName = 'workflow_dispatch';
    process.env['GITHUB_REPOSITORY'] = 'owner/repo';
    nock('https://api.github.com')
      .persist()
      .post('/repos/owner/repo/actions/workflows/workflow/dispatches', body => {
        const zooInput: string = body.inputs['build-zoo-handler'];
        const payloadJson = Buffer.from(zooInput, 'base64').toString('ascii');
        const clientPayload = JSON.parse(payloadJson);
        return lodash.isMatch(clientPayload, {
          build_zoo_handler_context: {
            handler_count: 1,
            controller_owner: 'owner',
            controller_repo: 'repo',
            controller_workflow: 'workflow',
            controller_ref: 'ref',
            properties: {
              prop1: 'value1',
              prop2: 'value2'
            }
          }
        });
      })
      .reply(204);
    const config = JSON.stringify([
      {
        if: 'initial == true',
        action: 'workflow_dispatch',
        workflow_dispatch: {
          owner: 'owner',
          repo: 'repo',
          workflow: 'workflow',
          ref: 'ref'
        }
      }
    ]);
    await dispatchHandler.handle('token', config, 10);
  }, 100000);
});
