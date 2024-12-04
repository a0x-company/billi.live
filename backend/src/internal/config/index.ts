// environment
export const PROJECT_ID = process.env.PROJECT_ID;
export const DATABASE_ENV = process.env.DATABASE_ENV;

function stopProgram(envKey: string) {
  console.error(`no ${envKey} specified in enviroment variable`);
  process.exit(1);
}

// validation
export function validateRequiredEnvs() {
  if (!PROJECT_ID) stopProgram("PROJECT_ID");
  if (!DATABASE_ENV) stopProgram("DATABASE_ENV");
}
