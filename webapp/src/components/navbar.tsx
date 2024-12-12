"use client";

// react
import { useCallback, useContext } from "react";

// axios
import axios from "axios";

// next
import Image from "next/image";
import Link from "next/link";

// context
import {
  FarcasterUser,
  FarcasterUserContext,
  LOCAL_STORAGE_KEYS,
} from "@/context/FarcasterUserContext";

// icons
import { LogOut, Tv, User2 } from "lucide-react";

// farcaster
import { SignInButton, StatusAPIResponse } from "@farcaster/auth-kit";

// auth
import { signIn, signOut } from "next-auth/react";

// css
import "./sign-in.css";

// components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const styleLink =
  "cursor-pointer bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-md transition-all duration-300 flex items-center justify-center";

const Navbar = () => {
  const farcasterContext = useContext(FarcasterUserContext);
  const { farcasterUser, setFarcasterUser, isConnected, setIsConnected } =
    farcasterContext;

  const createAndStoreSigner = useCallback(
    async (farcasterUser: FarcasterUser) => {
      try {
        const response = await axios.post("/api/signer", {
          user: farcasterUser,
        });
        if (response.status === 200) {
          const userWithStatus = {
            ...farcasterUser,
            ...response.data,
          };
          localStorage.setItem(
            LOCAL_STORAGE_KEYS.FARCASTER_USER,
            JSON.stringify(userWithStatus)
          );
          setFarcasterUser(userWithStatus);
        }
      } catch (error) {
        console.error("API Call failed", error);
      }
    },
    [setFarcasterUser]
  );

  const handleSuccess = useCallback(
    async (res: StatusAPIResponse) => {
      await signIn("credentials", {
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
        handle: res.username,
        pfpUrl: res.pfpUrl,
        fid: res.fid,
        displayName: res.displayName,
      });
      await createAndStoreSigner({
        handle: res.username,
        pfpUrl: res.pfpUrl,
        fid: res.fid,
        displayName: res.displayName,
      });
    },
    [setIsConnected, createAndStoreSigner, farcasterUser, setFarcasterUser]
  );

  const handleLogout = () => {
    signOut();
    localStorage.removeItem(LOCAL_STORAGE_KEYS.FARCASTER_USER);
    setFarcasterUser(null);
    setIsConnected(false);
  };

  return (
    <header className="bg-gray-800 shadow-sm max-md:px-4">
      <ul className="flex gap-4 w-full py-4 max-w-[1440px] mx-auto items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Tv className="w-8 h-8 text-purple-600" />
          <span className="text-xl font-bold text-white leading-none">
            billi.live
          </span>
        </Link>
        <li className={`${styleLink}`}>
          {isConnected && farcasterUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2">
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
                <p className="max-md:hidden">{farcasterUser.handle}</p>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-purple-500 mt-4 border-none">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <SignInButton onSuccess={handleSuccess} />
          )}
        </li>
      </ul>
    </header>
  );
};

export default Navbar;
