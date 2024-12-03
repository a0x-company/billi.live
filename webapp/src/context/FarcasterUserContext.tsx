import { useSession } from "next-auth/react";
import React, { createContext, useState, ReactNode, useEffect } from "react";

export interface FarcasterUser {
  signer_uuid?: string;
  public_key?: string;
  status?: string;
  signer_approval_url?: string;
  fid?: number;
  pfpUrl?: string;
  name?: string;
}

interface FarcasterUserContextProps {
  farcasterUser: FarcasterUser | null;
  setFarcasterUser: (user: FarcasterUser | null) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
}

const defaultContext: FarcasterUserContextProps = {
  farcasterUser: {},
  setFarcasterUser: () => {},
  isConnected: false,
  setIsConnected: () => {},
};

export const LOCAL_STORAGE_KEYS = {
  FARCASTER_USER: "farcasterUser",
};

export const FarcasterUserContext =
  createContext<FarcasterUserContextProps>(defaultContext);

export const FarcasterUserProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(
    defaultContext.farcasterUser
  );
  const [isConnected, setIsConnected] = useState<boolean>(
    defaultContext.isConnected
  );
  const { data: session } = useSession();

  useEffect(() => {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.FARCASTER_USER);
    console.log("storedData", storedData);
    if (storedData) {
      const user: FarcasterUser = JSON.parse(storedData);
      console.log("Usuario desde localStorage:", user);
      setFarcasterUser((prevUser) => ({ ...prevUser, ...user }));
      setIsConnected(true);
    }
  }, [setFarcasterUser, setIsConnected]);

  useEffect(() => {
    if (session?.user) {
      setFarcasterUser((prevUser) => ({
        ...prevUser,
        pfpUrl: session.user?.image || undefined,
        name: session.user?.name || undefined,
      }));
    }
  }, [session, setFarcasterUser]);

  console.log("farcasterUser", farcasterUser);

  return (
    <FarcasterUserContext.Provider
      value={{ farcasterUser, setFarcasterUser, isConnected, setIsConnected }}
    >
      {children}
    </FarcasterUserContext.Provider>
  );
};
