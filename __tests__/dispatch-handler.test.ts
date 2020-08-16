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
    const res = await jexl.eval("event == 'event1' && repo == 'repo1' && owner == 'owner1'", context);
  }, 100000);

  it('base64', () => {
    const b64 = new Buffer('hello').toString('base64');
    console.log(`b64: ${b64}`);
    const h = new Buffer(b64, 'base64').toString('ascii');
    console.log(`h: ${h}`);
  });
});
