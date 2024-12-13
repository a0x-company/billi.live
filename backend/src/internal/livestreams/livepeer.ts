// http client
import axios from "axios";

import { CreateLivestreamLivepeerResponse } from "./types";

// config
import { LIVEPEER_API_KEY } from "@internal/config";

export class LivepeerService {
  public async createLivestream(
    name: string,
    record: boolean
  ): Promise<CreateLivestreamLivepeerResponse> {
    const livepeerUrl = "https://livepeer.studio/api/stream";

    try {
      const response = await axios.post<CreateLivestreamLivepeerResponse>(
        livepeerUrl,
        {
          name: name,
          record: record,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LIVEPEER_API_KEY}`,
          },
        }
      );

      return response.data;
    } catch (err: unknown) {
      console.log(err instanceof Error ? err.message : "unknow error");
      throw new Error(err instanceof Error ? err.message : "unknow error");
    }
  }
}
