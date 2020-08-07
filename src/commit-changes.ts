import * as core from '@actions/core';
import {exec} from '@actions/exec';

export async function commitChanges(
  username: string,
  useremail: string,
  branch: string,
  message: string
): Promise<void> {
  await runCli(['config', '--global', 'user.name', username]);
  await runCli(['config', '--global', 'user.email', useremail]);
  await runCli(['commit', '-a', '-m', `${message}`]);
  await runCli(['push', 'origin', `${branch}`]);
}

async function runCli(args: string[] | undefined) {
  let res: number = await exec('git', args);
  if (res !== core.ExitCode.Success) {
    throw new Error('git exited with exit code ' + res);
  }
}
