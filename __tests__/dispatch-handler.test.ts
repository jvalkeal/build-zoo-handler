import nock from 'nock';
import * as dispatchHandler from '../src/dispatch-handler';

describe('workflow dispatch handler tests', () => {
  beforeAll(async () => {}, 300000);

  afterAll(async () => {}, 100000);

  it('Repository Dispatch posts request', async () => {
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

  it('Workflow Dispatch posts request', async () => {
    nock('https://api.github.com')
      .persist()
      .post('/repos/owner/repo/actions/workflows/workflow/dispatches', body => {
        return body.ref === 'ref' && body.inputs['build-zoo-handler'];
      })
      .reply(204);
    await dispatchHandler.handleWorkflowDispatch('token', 'owner', 'repo', {}, 'workflow', 'ref');
  }, 100000);
});
