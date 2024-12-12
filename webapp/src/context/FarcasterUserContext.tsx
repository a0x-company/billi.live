import { useSession } from "next-auth/react";
import React, { createContext, useState, ReactNode, useEffect } from "react";

export interface FarcasterUser {
  signer_uuid?: string;
  public_key?: string;
  status?: string;
  signer_approval_url?: string;
  fid?: number;
  pfpUrl?: string;
  handle?: string;
  displayName?: string;
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
    if (!isConnected) {
      const storedData = localStorage.getItem(
        LOCAL_STORAGE_KEYS.FARCASTER_USER
      );
      if (storedData) {
        const user: FarcasterUser = JSON.parse(storedData);
        setFarcasterUser((prevUser) => ({ ...prevUser, ...user }));
        setIsConnected(true);
      }
    }
  }, [setFarcasterUser, isConnected]);

  useEffect(() => {
    if (session?.user && !farcasterUser?.fid) {
      if (
        farcasterUser?.pfpUrl !== session.user?.image ||
        farcasterUser?.handle !== session.user?.name
      ) {
        setFarcasterUser((prevUser) => ({
          ...prevUser,
          pfpUrl: session.user?.image || undefined,
          handle: session.user?.name || undefined,
        }));
      }
    }
  }, [session, setFarcasterUser, farcasterUser]);

  return (
    <FarcasterUserContext.Provider
      value={{ farcasterUser, setFarcasterUser, isConnected, setIsConnected }}
    >
      {children}
    </FarcasterUserContext.Provider>
  );
};
