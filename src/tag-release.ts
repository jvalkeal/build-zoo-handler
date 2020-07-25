import * as core from '@actions/core';
import {exec} from '@actions/exec';

export async function tagRelease(
  username: string,
  useremail: string,
  branch: string,
  tag: string
): Promise<void> {
  await runCli(['config', '--global', 'user.name', username]);
  await runCli(['config', '--global', 'user.email', useremail]);
  await runCli(['checkout', '-b', branch]);
  await runCli(['commit', '-a', '-m', `"Release ${branch}"`]);
  await runCli(['push', 'origin', `${branch}`]);
  await runCli(['tag', `v${tag}`]);
  await runCli(['push', '--tags', 'origin']);
}

async function runCli(args: string[] | undefined) {
  let res: number = await exec('git', args);
  if (res !== core.ExitCode.Success) {
    throw new Error('git exited with exit code ' + res);
  }
}
