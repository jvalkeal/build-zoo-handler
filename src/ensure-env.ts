export async function checkEnv(envs: string[]): Promise<void> {
  return Promise.all(
    envs.map(env => {
      if (process.env[env]) {
        return Promise.resolve();
      } else {
        return Promise.reject(new Error(`Env ${env} not found`));
      }
    })
  ).then();
}
