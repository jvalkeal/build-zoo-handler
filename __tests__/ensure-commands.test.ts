import * as ensureCommands from '../src/ensure-commands';

describe('ensure commands tests', () => {
  beforeAll(async () => {
  }, 300000);

  afterAll(async () => {
  }, 100000);

  it('Command should exist', async () => {
    await expect(ensureCommands.checkCommands(['git'])).resolves.toBeTruthy();
  }, 100000);

  it('Command should not exist', async () => {
    await expect(ensureCommands.checkCommands(['fake'])).rejects.toThrow();
  }, 100000);

});
