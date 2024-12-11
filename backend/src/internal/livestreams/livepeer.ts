// http client
import axios from "axios";

import { CreateLivestreamLivepeerResponse } from "./types";

export class LivepeerService {
  public async createLivestream(
    name: string,
    record: boolean
  ): Promise<CreateLivestreamLivepeerResponse> {
    const LIVEPEER_API_KEY = "7dbfcf3b-155e-4312-98dc-1db53bb28da2";

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
