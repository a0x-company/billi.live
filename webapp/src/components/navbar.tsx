"use client";

// axios

// wagmi
import { useAccount, useConnect } from "wagmi";

// config
import { truncateEthAddress } from "@/utils/truncate-address";
import {
  SignInButton,
  StatusAPIResponse,
  useProfile,
} from "@farcaster/auth-kit";
import "./sign-in.css";
import { useCallback, useEffect, useState } from "react";
// import { useSession, signIn, signOut, getCsrfToken } from "next-auth/react";

const styleLink =
  "cursor-pointer bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-md transition-all duration-300 flex items-center justify-center";

const Navbar = () => {
  const [isConnected, setIsConnected] = useState(false);
  // const { data: session } = useSession();
  // console.log("session", session);
  const {
    isAuthenticated,
    profile: { username, fid, bio, displayName, pfpUrl },
  } = useProfile();

  const saveFid = () => {
    console.log("fid", fid, username);
    if (!fid) return;
    return localStorage.setItem("fid", fid.toString());
  };

  useEffect(() => {
    const getFid = localStorage.getItem("fid");
    if (getFid) setIsConnected(true);
  }, [isConnected]);

  const handleSuccess = useCallback((res: StatusAPIResponse) => {
    setIsConnected(true);
    // signIn("credentials", {
    //   message: res.message,
    //   signature: res.signature,
    //   name: res.username,
    //   pfp: res.pfpUrl,
    //   redirect: false,
    // });
  }, []);

  return (
    <>
      <ul className="flex gap-4 w-full justify-center px-20 py-4">
        <li className={styleLink}>Home</li>
        <li className={styleLink}>About</li>
        <li className={styleLink}>Contact</li>
        <li className={`${styleLink} ml-auto`}>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <img src={pfpUrl} alt="pfp" className="w-8 h-8 rounded-full" />
              {displayName}
            </div>
          ) : (
            <SignInButton onSuccess={handleSuccess} />
          )}
        </li>
      </ul>
    </>
  );
};

export default Navbar;
