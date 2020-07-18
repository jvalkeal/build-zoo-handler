import * as ensureEnv from '../src/ensure-env';

describe('ensure commands tests', () => {
  beforeAll(async () => {}, 300000);

  afterAll(async () => {}, 100000);

  it('Env should exist', async () => {
    await expect(ensureEnv.checkEnv(['HOME'])).resolves.toBeTruthy();
  }, 100000);

  it('Env should not exist', async () => {
    await expect(ensureEnv.checkEnv(['fake'])).rejects.toThrow();
  }, 100000);
});
