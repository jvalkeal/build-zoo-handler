import jexl from 'jexl';

describe('workflow dispatch handler tests', () => {
  beforeAll(async () => {}, 300000);

  afterAll(async () => {}, 100000);

  it('Throws if missing version', async () => {
    const context = {
      repo: 'repo1',
      owner: 'owner1',
      event: 'event1'
    };
    const res = await jexl.eval(
      "event == 'event1' && repo == 'repo1' && owner == 'owner1'",
      context
    );
  }, 100000);
});
