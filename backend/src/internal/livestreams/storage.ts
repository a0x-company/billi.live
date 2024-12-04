// firestore
import { Firestore } from "@google-cloud/firestore";

// types
import { StreamInfo } from "./types";

export class LivestreamStorage {
  firestore: Firestore;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  private readonly LIVES_COLLECTION = "livestreams";

  public async saveLivestream(
    title: string,
    description: string,
    livepeerInfo: StreamInfo
  ): Promise<void> {
    try {
      const countDocRef = this.firestore.collection(this.LIVES_COLLECTION).doc("count");
      const countDoc = await countDocRef.get();

      if (!countDoc.exists) {
        throw new Error("document with id count does not exist");
      }

      const countData = countDoc.data();
      const currentCount = countData?.total;

      if (typeof currentCount !== "number") {
        throw new Error("invalid count value");
      }

      const newCount = currentCount + 1;

      const newDocRef = this.firestore.collection(this.LIVES_COLLECTION).doc(newCount.toString());

      await newDocRef.set({
        title,
        livepeerInfo,
        createdAt: new Date(),
        status: "created",
        description,
      });

      await countDocRef.update({ total: newCount });
    } catch (err: unknown) {
      console.log(err instanceof Error ? err.message : "unknow error");
      throw new Error(err instanceof Error ? err.message : "unknow error");
    }
  }
}
