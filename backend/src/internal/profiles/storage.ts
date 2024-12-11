// third-party
import { Firestore } from "@google-cloud/firestore";

// service
import { Profile } from "./entities";

export class ProfileStorage {
  constructor(private db: Firestore) {}

  private readonly PROFILES_COLLECTION = "farcaster-users";

  public async get(fid: number): Promise<Profile[]> {
    const profiles: Profile[] = [];
    const snapshot = await this.db
      .collection(this.PROFILES_COLLECTION)
      .where("fid", "==", fid)
      .where("deletedAt", "==", null)
      .get();

    if (snapshot.empty) return [];

    for (const doc of snapshot.docs) {
      const profile = doc.data() as Profile;
      profiles.push(profile);
    }

    return profiles;
  }

  public async getSignerUuid(handle: string): Promise<string | null> {
    try {
      const snapshot = await this.db
        .collection(this.PROFILES_COLLECTION)
        .where("handle", "==", handle)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }
      const profile = snapshot.docs[0].data();
      console.log("profile", profile);
      return profile.signer_uuid || null;
    } catch (err) {
      console.log("error", err);
      return null;
    }
  }

  public async getProfileId(handle: string): Promise<number | null> {
    const snapshot = await this.db
      .collection(this.PROFILES_COLLECTION)
      .where("handle", "==", handle)
      .where("deletedAt", "==", null)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const profile = snapshot.docs[0].data();
    return profile.fid || null;
  }
}
