// environment
export const NODE_ENV = process.env.NODE_ENV;
export const PROJECT_ID = process.env.PROJECT_ID;

function stopProgram(envKey: string) {
  console.error(`no ${envKey} specified in enviroment variable`);
  process.exit(1);
}

// validation
export function validateRequiredEnvs() {
  if (!NODE_ENV) stopProgram("NODE_ENV");
  if (!PROJECT_ID) stopProgram("PROJECT_ID");
}
