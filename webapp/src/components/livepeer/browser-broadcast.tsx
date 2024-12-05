"use client";

import { useEffect } from "react";

// next
import Image from "next/image";

// context
import { useStreaminStore } from "@/context/LivestreamContext";

// livepeer
import { getIngest } from "@livepeer/react/external";
import * as Broadcast from "@livepeer/react/broadcast";
import { useBroadcastContext, useStore } from "@livepeer/react/broadcast";

type BrowserBroadcastProps = {
  streamKey: string;
};

export default function BrowserBroadcast({ streamKey }: BrowserBroadcastProps) {
  const { statusOfStreaming } = useStreaminStore();

  return (
    <Broadcast.Root ingestUrl={getIngest(streamKey)}>
      <Broadcast.Container className="h-full w-full ">
        <Broadcast.Video
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
        />

        <CustomComponent />

        <Broadcast.Controls className="absolute bottom-0 left-0 right-0 flex flex-col justify-center items-center">
          <div className="flex-1 " />

          <div className="flex flex-row gap-[16px] items-center content-center mb-[20px]">
            <Broadcast.EnabledTrigger className="flex items-center gap-[16px] py-[8px] px-[16px] rounded-full bg-[rgba(255,41,79,0.40)]">
              {statusOfStreaming == "idle" && (
                <Image
                  src="/assets/stream/start-live.svg"
                  alt="start-live"
                  width={30}
                  height={30}
                />
              )}

              <Broadcast.EnabledIndicator asChild>
                <Image
                  src="/assets/stream/stop-live.svg"
                  alt="stop-live"
                  width={30}
                  height={30}
                />
              </Broadcast.EnabledIndicator>

              {statusOfStreaming == "idle" && (
                <span className="text-white font-sf-pro-rounded font-bold text-[20px]">
                  Start broadcasting
                </span>
              )}

              {statusOfStreaming == "live" && (
                <span className="text-white font-sf-pro-rounded font-bold text-[20px]">
                  Stop broadcasting
                </span>
              )}
            </Broadcast.EnabledTrigger>

            <Broadcast.AudioEnabledTrigger>
              <div className="h-[48px] w-[48px] flex justify-center items-center content-center m-auto rounded-full bg-[rgba(32,32,32,0.40)] ">
                <Broadcast.AudioEnabledIndicator asChild matcher={false}>
                  <Image
                    src="/assets/stream/microphone.svg"
                    alt="microphone"
                    width={20}
                    height={20}
                  />
                </Broadcast.AudioEnabledIndicator>

                <Broadcast.AudioEnabledIndicator asChild>
                  <Image
                    src="/assets/stream/microphone-off.svg"
                    alt="microphone"
                    width={20}
                    height={20}
                  />
                </Broadcast.AudioEnabledIndicator>
              </div>
            </Broadcast.AudioEnabledTrigger>

            <Broadcast.VideoEnabledTrigger>
              <div className="h-[48px] w-[48px] flex justify-center items-center content-center m-auto rounded-full bg-[rgba(32,32,32,0.40)] ">
                <Broadcast.VideoEnabledIndicator asChild matcher={false}>
                  <Image
                    src="/assets/stream/video.svg"
                    alt="video"
                    width={30}
                    height={30}
                  />
                </Broadcast.VideoEnabledIndicator>

                <Broadcast.VideoEnabledIndicator asChild>
                  <Image
                    src="/assets/stream/video-off.svg"
                    alt="video"
                    width={30}
                    height={30}
                  />
                </Broadcast.VideoEnabledIndicator>
              </div>
            </Broadcast.VideoEnabledTrigger>

            <Broadcast.ScreenshareTrigger>
              <div className="h-[48px] w-[48px] flex justify-center items-center content-center rounded-full bg-[rgba(32,32,32,0.40)] ">
                <Broadcast.ScreenshareIndicator asChild matcher={false}>
                  <Image
                    src="/assets/stream/share-screen.svg"
                    alt="screenshare"
                    width={30}
                    height={30}
                  />
                </Broadcast.ScreenshareIndicator>

                <Broadcast.ScreenshareIndicator asChild>
                  <Image
                    src="/assets/stream/share-screen-off.svg"
                    alt="screenshare"
                    width={30}
                    height={30}
                  />
                </Broadcast.ScreenshareIndicator>
              </div>
            </Broadcast.ScreenshareTrigger>
          </div>
        </Broadcast.Controls>
      </Broadcast.Container>
    </Broadcast.Root>
  );
}

function CustomComponent({
  __scopeBroadcast,
}: Broadcast.BroadcastScopedProps<unknown>) {
  const { setStatusOfStreaming } = useStreaminStore();

  const context = useBroadcastContext("CustomComponent", __scopeBroadcast);

  const { status } = useStore(context.store, ({ status }) => ({ status }));

  useEffect(() => {
    setStatusOfStreaming(status);
  }, [status, setStatusOfStreaming]);

  return null;
}
