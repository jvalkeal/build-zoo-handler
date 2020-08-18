import nock from 'nock';
import * as dispatchHandler from '../src/dispatch-handler';

describe('workflow dispatch handler tests', () => {
  beforeAll(async () => {}, 300000);

  afterAll(async () => {}, 100000);

  it('Repository Dispatch posts request', async () => {
    nock('https://api.github.com')
      .persist()
      .post(
        '/repos/owner/repo/dispatches',
        '{"event_type":"eventType","client_payload":{"build_zoo_handler_context":{"handler_count":1,"properties":{}},"build_zoo_handler_data":{"properties":{}}}}'
      )
      .reply(204);
    await dispatchHandler.handleRepositoryDispatch('token', 'owner', 'repo', 'eventType', {});
  }, 100000);

  it('Workflow Dispatch posts request', async () => {
    nock('https://api.github.com')
      .persist()
      .post(
        '/repos/owner/repo/actions/workflows/workflow/dispatches',
        '{"ref":"ref","inputs":{"build-zoo-handler":"eyJidWlsZF96b29faGFuZGxlcl9jb250ZXh0Ijp7ImhhbmRsZXJfY291bnQiOjAsInByb3BlcnRpZXMiOnt9fSwiYnVpbGRfem9vX2hhbmRsZXJfZGF0YSI6eyJwcm9wZXJ0aWVzIjp7fX19"}}'
      )
      .reply(204);
    await dispatchHandler.handleWorkflowDispatch('token', 'owner', 'repo', {}, 'workflow', 'ref');
  }, 100000);
});
