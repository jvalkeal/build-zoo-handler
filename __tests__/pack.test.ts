import io = require('@actions/io');
import fs = require('fs');
import path = require('path');
import child_process = require('child_process');

const toolDir = path.join(__dirname, 'runner', 'tools');
const tempDir = path.join(__dirname, 'runner', 'temp');
const cliDir = path.join(__dirname, 'runner', 'cli');
const IS_WINDOWS = process.platform === 'win32';

process.env['RUNNER_TOOL_CACHE'] = toolDir;
process.env['RUNNER_TEMP'] = tempDir;
import * as pack from '../src/pack';

let cliFilePath = '';
let cliUrl = '';
if (process.platform === 'win32') {
  cliFilePath = path.join(cliDir, 'cli_win.zip');
  cliUrl = 'https://github.com/buildpacks/pack/releases/download/v0.12.0/pack-v0.12.0-windows.zip';
} else if (process.platform === 'darwin') {
  cliFilePath = path.join(cliDir, 'cli_mac.tgz');
  cliUrl = 'https://github.com/buildpacks/pack/releases/download/v0.12.0/pack-v0.12.0-macos.tgz';
} else {
  cliFilePath = path.join(cliDir, 'cli_linux.tgz');
  cliUrl = 'https://github.com/buildpacks/pack/releases/download/v0.12.0/pack-v0.12.0-linux.tgz';
}

describe('cli installer tests', () => {
  beforeAll(async () => {
    await io.rmRF(toolDir);
    await io.rmRF(tempDir);
    await io.rmRF(cliDir);
    if (!fs.existsSync(`${cliFilePath}.complete`)) {
      // Download cli
      await io.mkdirP(cliDir);

      console.log('Downloading cli');
      child_process.execSync(`curl "${cliUrl}" > "${cliFilePath}"`);
      // Write complete file so we know it was successful
      fs.writeFileSync(`${cliFilePath}.complete`, 'content');
    }
  }, 300000);

  afterAll(async () => {
    try {
      await io.rmRF(toolDir);
      await io.rmRF(tempDir);
      await io.rmRF(cliDir);
    } catch {
      console.log('Failed to remove test directories');
    }
  }, 100000);

  it('Downloads cli with version given', async () => {
    await pack.getPackCli('0.12.0');
    const cliDir = path.join(toolDir, 'pack', '0.12.0', 'x64');

    expect(fs.existsSync(`${cliDir}.complete`)).toBe(true);
    if (IS_WINDOWS) {
      expect(fs.existsSync(path.join(cliDir, 'pack.exe'))).toBe(true);
    } else {
      expect(fs.existsSync(path.join(cliDir, 'pack'))).toBe(true);
    }
  }, 100000);

  it('Throws if missing version', async () => {
    let thrown = false;
    try {
      await pack.getPackCli('');
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
  }, 100000);
});
