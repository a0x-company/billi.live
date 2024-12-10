import axios, { AxiosInstance } from "axios";
import { NEYNAR_API_KEY, NEYNAR_API_URL_V2 } from "@internal/config";

// ts-unused-exports:disable-next-line
export function createNeynarClient(): AxiosInstance {
  return axios.create({
    baseURL: NEYNAR_API_URL_V2,
    headers: {
      accept: "application/json",
      Api_key: `${NEYNAR_API_KEY}`,
    },
  });
}
