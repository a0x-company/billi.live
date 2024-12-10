import { AGENT_API_URL } from "@internal/config";
import axios, { AxiosInstance } from "axios";

// ts-unused-exports:disable-next-line
export function createAgentClient(): AxiosInstance {
  return axios.create({
    baseURL: AGENT_API_URL,
    headers: {
      accept: "application/json",
    },
  });
}
