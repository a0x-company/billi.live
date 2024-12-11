// third-part
import { Firestore } from "@google-cloud/firestore";

// service
import { Profile } from "./entities";
import { ProfileStorage } from "./";

export enum FetchType {
  PROFILE = "profile",
}

interface ProfileGetter {
  get(fid: number): Promise<Profile[]>;
  getSignerUuid(handle: string): Promise<string | null>;
  getProfileId(handle: string): Promise<number | null>;
}

interface ProfileManager extends ProfileGetter {}

interface FarcasterManager {
  executeFetch<T, U = any>(
    fetchType: FetchType,
    identifier: string,
    additionalData?: U
  ): Promise<T>;
}

// ts-unused-exports:disable-next-line
export class ProfilesService {
  private storage: ProfileManager;

  constructor(db: Firestore) {
    this.storage = new ProfileStorage(db);
  }

  async get(fid: number): Promise<Profile[]> {
    const profiles = await this.storage.get(fid);
    if (profiles.length === 0) return [];

    return profiles;
  }

  async getSignerUuid(handle: string): Promise<string | null> {
    return this.storage.getSignerUuid(handle);
  }

  async getProfileId(handle: string): Promise<number | null> {
    return this.storage.getProfileId(handle);
  }
}
