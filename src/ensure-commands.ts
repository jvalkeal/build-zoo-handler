import * as io from '@actions/io';

export async function checkCommands(commands: string[]): Promise<void> {
    return Promise.all(commands.map(command => io.which(command, true))).then();
}
