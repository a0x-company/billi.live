// environment
export const NODE_ENV = process.env.NODE_ENV;
export const PROJECT_ID = process.env.PROJECT_ID;
export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
export const NEYNAR_API_URL_V2 = process.env.NEYNAR_API_URL_V2;

function stopProgram(envKey: string) {
  console.error(`no ${envKey} specified in enviroment variable`);
  process.exit(1);
}

// validation
export function validateRequiredEnvs() {
  if (!NODE_ENV) stopProgram("NODE_ENV");
  if (!PROJECT_ID) stopProgram("PROJECT_ID");
  if (!NEYNAR_API_KEY) stopProgram("NEYNAR_API_KEY");
  if (!NEYNAR_API_URL_V2) stopProgram("NEYNAR_API_URL_V2");
}
