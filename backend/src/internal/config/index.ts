// environment
export const NODE_ENV = process.env.NODE_ENV;
export const PROJECT_ID = process.env.PROJECT_ID;
export const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
export const NEYNAR_API_URL_V2 = process.env.NEYNAR_API_URL_V2;
export const PLAYHT_API_KEY = process.env.PLAYHT_API_KEY;
export const PLAYHT_USER_ID = process.env.PLAYHT_USER_ID;
export const AGENT_API_URL = process.env.AGENT_API_URL;
export const AGENT_ID = process.env.AGENT_ID;

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
  if (!PLAYHT_API_KEY) stopProgram("PLAYHT_API_KEY");
  if (!PLAYHT_USER_ID) stopProgram("PLAYHT_USER_ID");
  if (!AGENT_API_URL) stopProgram("AGENT_API_URL");
  if (!AGENT_ID) stopProgram("AGENT_ID");
}
