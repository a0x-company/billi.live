export const STREAMING_COUNTER_SERVER_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8080"
    : "https://development-livestreams-vibra-matiaspp96-fietbrotma-uc.a.run.app";
