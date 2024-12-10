// firestore
import { Firestore } from "@google-cloud/firestore";

// types
import { Livestream, StreamInfo } from "./types";

export class LivestreamStorage {
  firestore: Firestore;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  private readonly LIVES_COLLECTION = "livestreams";

  public async saveLivestream(
    handle: string,
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
        handle,
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

  public async updateLivestreamStatus(
    streamId: string,
    status: string
  ): Promise<Livestream | null> {
    try {
      const querySnapshot = await this.firestore
        .collection(this.LIVES_COLLECTION)
        .where("livepeerInfo.streamId", "==", streamId)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        await doc.ref.update({ status: status });
        const updatedDoc = await doc.ref.get();
        const data = updatedDoc.data();
        if (data) {
          return {
            handle: data.handle,
            title: data.title,
            livepeerInfo: data.livepeerInfo,
            createdAt: data.createdAt,
            castInFarcaster: true,
            status: data.status,
            description: data.description,
          };
        }
      }

      return null;
    } catch (err: any) {
      if (err.code) {
        console.log("error code Firestore:", err.code);
      } else {
        console.log(err instanceof Error ? err.message : "error desconocido");
      }
      throw new Error(err instanceof Error ? err.message : "error desconocido");
    }
  }

  public async getLastLivestreamForHandle(handle: string): Promise<Livestream | null> {
    try {
      const querySnapshot = await this.firestore
        .collection(this.LIVES_COLLECTION)
        .where("handle", "==", handle)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();

        return {
          handle: data.handle,
          title: data.title,
          livepeerInfo: data.livepeerInfo,
          createdAt: data.createdAt,
          castInFarcaster: data.castInFarcaster,
          status: data.status,
        };
      }

      return null;
    } catch (err: any) {
      console.log(err instanceof Error ? err.message : "unknow error");
      throw new Error(err instanceof Error ? err.message : "unknow error");
    }
  }

  public async getLives(): Promise<Livestream[]> {
    try {
      const querySnapshot = await this.firestore
        .collection(this.LIVES_COLLECTION)
        .where("status", "==", "live")
        .get();

      const lives = querySnapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          handle: data.handle,
          title: data.title,
          livepeerInfo: data.livepeerInfo,
          createdAt: data.createdAt,
          castInFarcaster: data.castInFarcaster,
          status: data.status,
          tokenAddress: data.tokenAddress,
          streamedByAgent: data.streamedByAgent,
        };
      });

      return lives;
    } catch (err: any) {
      console.log(err instanceof Error ? err.message : "unknow error");
      throw new Error(err instanceof Error ? err.message : "unknow error");
    }
  }

  public async getLivestreamByTokenAddress(tokenAddress: string): Promise<Livestream | null> {
    try {
      const querySnapshot = await this.firestore
        .collection(this.LIVES_COLLECTION)
        .where("tokenAddress", "==", tokenAddress)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();

        return {
          handle: data.handle,
          tokenAddress: data.tokenAddress,
          title: data.title,
          livepeerInfo: data.livepeerInfo,
          createdAt: data.createdAt,
          status: data.status,
          streamedByAgent: data.streamedByAgent,
        };
      }

      return null;
    } catch (err: any) {
      console.log(err instanceof Error ? err.message : "unknow error");
      throw new Error(err instanceof Error ? err.message : "unknow error");
    }
  }

  public async addPubHashToLivestream(
    streamId: string,
    pubHash: string
  ): Promise<Livestream | null> {
    try {
      const querySnapshot = await this.firestore
        .collection(this.LIVES_COLLECTION)
        .where("livepeerInfo.streamId", "==", streamId)
        .limit(1)
        .get();

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        await doc.ref.update({ pubHash: pubHash });

        const updatedDoc = await doc.ref.get();
        const data = updatedDoc.data();

        if (data) {
          return {
            handle: data.handle,
            title: data.title,
            livepeerInfo: data.livepeerInfo,
            createdAt: data.createdAt,
            status: data.status,
            description: data.description,
            pubHash: data.pubHash,
          };
        }
      }

      return null;
    } catch (err: any) {
      console.log(err instanceof Error ? err.message : "error desconocido");
      throw new Error(err instanceof Error ? err.message : "error desconocido");
    }
  }

  public async getPubHashByStreamId(streamId: string): Promise<string | null> {
    const querySnapshot = await this.firestore
      .collection(this.LIVES_COLLECTION)
      // .where("livepeerInfo.streamId", "==", streamId) // TODO: change to livepeerInfo.streamId
      .where("tokenAddress", "==", streamId)
      .limit(1)
      .get();

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return data.pubHash || null;
    }

    return null;
  }
}
