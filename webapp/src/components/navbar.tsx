"use client";

// axios
import axios from "axios";

// wagmi

// config
import {
  FarcasterUser,
  FarcasterUserContext,
  LOCAL_STORAGE_KEYS,
} from "@/context/FarcasterUserContext";
import { SignInButton, StatusAPIResponse } from "@farcaster/auth-kit";
import { signIn } from "next-auth/react";
import { useCallback, useContext, useEffect } from "react";
import "./sign-in.css";
import Image from "next/image";
import { User2 } from "lucide-react";

const styleLink =
  "cursor-pointer bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-md transition-all duration-300 flex items-center justify-center";

const Navbar = () => {
  const farcasterContext = useContext(FarcasterUserContext);
  const { farcasterUser, setFarcasterUser, isConnected, setIsConnected } =
    farcasterContext;

  const createAndStoreSigner = useCallback(async () => {
    try {
      const response = await axios.post("/api/signer");
      if (response.status === 200) {
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.FARCASTER_USER,
          JSON.stringify(response.data)
        );
        setFarcasterUser(response.data);
      }
    } catch (error) {
      console.error("API Call failed", error);
    }
  }, [setFarcasterUser]);

  const handleSuccess = useCallback(
    (res: StatusAPIResponse) => {
      signIn("credentials", {
        message: res.message,
        signature: res.signature,
        name: res.username,
        pfp: res.pfpUrl,
        nonce: res.nonce,
        redirect: false,
      });
      setIsConnected(true);
      setFarcasterUser({
        ...farcasterUser,
        name: res.username,
        pfpUrl: res.pfpUrl,
      });
      createAndStoreSigner();
    },
    [setIsConnected, createAndStoreSigner, farcasterUser, setFarcasterUser]
  );

  return (
    <ul className="flex gap-4 w-full justify-center px-20 py-4">
      <li className={styleLink}>Home</li>
      <li className={styleLink}>About</li>
      <li className={styleLink}>Contact</li>
      <li className={`${styleLink} ml-auto`}>
        {isConnected ? (
          <div className="flex items-center gap-2">
            {farcasterUser.pfpUrl ? (
              <Image
                src={farcasterUser.pfpUrl}
                alt="pfp"
                className="w-8 h-8 rounded-full"
                width={32}
                height={32}
              />
            ) : (
              <User2 className="w-8 h-8" />
            )}
            {farcasterUser.name}
          </div>
        ) : (
          <SignInButton onSuccess={handleSuccess} />
        )}
      </li>
    </ul>
  );
};

export default Navbar;
