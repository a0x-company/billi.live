const validateEnvVariables = () => {
  const requiredEnvVars = [
    "NEYNAR_API_KEY",
    "NEYNAR_AGENT_SIGNER_UUID",
    "NEYNAR_AGENT_FID",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missingEnvVars.join(", ")}`
    );
  }

  const fid = parseInt(process.env.NEYNAR_AGENT_FID!);
  if (isNaN(fid)) {
    throw new Error("NEYNAR_AGENT_FID debe ser un número válido");
  }

  return {
    API_KEY: process.env.NEYNAR_API_KEY!,
    SIGNER_UUID: process.env.NEYNAR_AGENT_SIGNER_UUID!,
    FID: fid,
  };
};

export const NEYNAR_CONFIG = {
  WEBHOOK_CACHE_TIMEOUT: 60000, // 1 minuto
  ACTION_RESPONSE_TIMEOUT: 5000, // 5 segundos
  DEFAULT_PORT: 3001,
  MAX_RETRIES: 3,
  MAX_MESSAGE_LENGTH: 320,
  CREDENTIALS: validateEnvVariables(),
  API_ENDPOINTS: {
    WEBHOOK: "https://api.neynar.com/v2/farcaster/webhook",
    CONVERSATION: "https://api.neynar.com/v2/farcaster/cast/conversation",
    CAST: "https://api.neynar.com/v2/farcaster/cast",
  },
  NGROK: {
    KILL_ON_START: true,
    RECONNECT_DELAY: 1000,
  },
};
