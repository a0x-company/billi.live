"use client";

import { Livestream } from "@/firebase/action/livestream/getLivestream";
import { cn } from "@/utils/tailwindcss";
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Monitor,
  Video,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { StatusStream, StreamHostProps, TypeStream } from "./stream-host";

interface StreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  stream: Livestream;
  streamHost: StreamHostProps;
  onSelectStreamType: (type: TypeStream, status?: StatusStream) => void;
}

export const StreamModal: React.FC<StreamModalProps> = ({
  isOpen,
  onClose,
  stream,
  streamHost,
  onSelectStreamType,
}) => {
  const [showKey, setShowKey] = useState(false);
  const [copyStreamKey, setCopyStreamKey] = useState(false);
  const [copyStreamUrl, setCopyStreamUrl] = useState(false);

  const streamUrl = "rtmp://rtmp.livepeer.com/live";
  const streamKey = stream.livepeerInfo.streamKey ?? "";

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        {!streamHost.streamType ? (
          <>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">
              Start Streaming
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => onSelectStreamType("obs")}
                className="w-full p-4 border dark:border-gray-700 rounded-lg flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Monitor className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-semibold dark:text-white">
                    Stream from OBS
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Use OBS or similar streaming software
                  </p>
                </div>
              </button>

              <button
                onClick={() => onSelectStreamType("browser")}
                className="w-full p-4 border dark:border-gray-700 rounded-lg flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Video className="w-6 h-6 text-purple-600" />
                <div className="text-left">
                  <h3 className="font-semibold dark:text-white">
                    Stream from Browser
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Stream directly from your browser
                  </p>
                </div>
              </button>
            </div>
          </>
        ) : streamHost.streamType === "obs" ? (
          <>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">
              OBS Stream Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stream URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={streamUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(streamUrl);
                      setCopyStreamUrl(true);
                      setTimeout(() => {
                        setCopyStreamUrl(false);
                      }, 3000);
                    }}
                    className={cn(
                      "px-3 py-2 bg-purple-600 text-white rounded-r-md hover:bg-purple-700 transition-colors relative",
                      copyStreamUrl && "bg-green-600 hover:bg-green-700"
                    )}
                  >
                    <Check
                      className={cn(
                        "w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 opacity-0",
                        copyStreamUrl && "opacity-100"
                      )}
                    />
                    <ExternalLink
                      className={cn(
                        "w-4 h-4 transition-opacity duration-300 opacity-100",
                        copyStreamUrl && "opacity-0"
                      )}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stream Key
                </label>
                <div className="flex">
                  <input
                    type={showKey ? "text" : "password"}
                    value={streamKey}
                    readOnly
                    className="flex-1 px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-l-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 py-2 border-y border-r dark:border-gray-600 dark:bg-gray-700 rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    {showKey ? (
                      <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Never share your stream key with anyone.
                </p>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(streamKey);
                  setCopyStreamKey(true);
                  setTimeout(() => {
                    setCopyStreamKey(false);
                  }, 3000);
                }}
                className={cn(
                  "w-full py-2 px-4 rounded-md transition-all duration-300 relative",
                  "bg-purple-600 hover:bg-purple-700 text-white",
                  copyStreamKey && "bg-green-600 hover:bg-green-700"
                )}
              >
                <Check
                  className={cn(
                    "w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 opacity-0",
                    copyStreamKey && "opacity-100"
                  )}
                />
                <p
                  className={cn(
                    "opacity-100 transition-opacity duration-300",
                    copyStreamKey && "opacity-0"
                  )}
                >
                  Copy Stream Key
                </p>
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6 dark:text-white">
              Browser Stream
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Allow access to your camera and microphone to start streaming
              directly from your browser.
            </p>
            <button
              onClick={() => {
                onSelectStreamType("browser", "streaming");
                onClose();
              }}
              className="w-full py-2 px-4 rounded-md bg-purple-600 hover:bg-purple-700 text-white transition-colors"
            >
              Start Browser Stream
            </button>
          </>
        )}

        {streamHost.streamType && (
          <button
            onClick={() => onSelectStreamType(null, streamHost.status)}
            className="mt-4 w-full py-2 px-4 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
};
