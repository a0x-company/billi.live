"use client";

import { FarcasterUserContext } from "@/context/FarcasterUserContext";
import axios from "axios";
import { useContext, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import QRCode from "qrcode.react";
import { Component } from "react";

declare module "qrcode.react" {
  interface QRCodeProps {
    value: string;
    size?: number;
    bgColor?: string;
    fgColor?: string;
    level?: "L" | "M" | "Q" | "H";
    includeMargin?: boolean;
  }

  export default class QRCode extends Component<QRCodeProps> {}
}

const text = "@clanker create token";

const CreateToken: React.FC = () => {
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { farcasterUser } = useContext(FarcasterUserContext);
  const createToken = async () => {
    setIsCreatingToken(true);
    console.log("farcasterUser", farcasterUser);
    if (!farcasterUser) {
      console.log("no farcaster user");
      return;
    }
    if (farcasterUser.status !== "approved") {
      setIsDialogOpen(true);
      setIsCreatingToken(false);
      return;
    }
    try {
      const response = await axios.post("/api/create-token", {
        text: text,
        signer_uuid: farcasterUser.signer_uuid,
      });
      if (response.status === 200) {
        alert("Cast successful");
      }
    } catch (error) {
      console.error("Could not send the cast", error);
    } finally {
      setIsCreatingToken(false); // Re-enable the button
    }
  };
  return (
    <>
      <button
        onClick={() => {
          createToken();
        }}
        disabled={isCreatingToken}
        className="bg-blue-500 text-white p-2 rounded-md"
      >
        {isCreatingToken ? "Creating..." : "create token"}
      </button>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {farcasterUser.status === "pending_approval"
                ? "Your request is pending approval"
                : "Your request has been approved"}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {farcasterUser.status === "pending_approval"
              ? "Please wait for your request to be approved"
              : "You can now create a token"}
          </DialogDescription>
          {farcasterUser.status !== "approved" &&
            farcasterUser.signer_approval_url && (
              <QRCode value={farcasterUser.signer_approval_url} />
            )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateToken;
