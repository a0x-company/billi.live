"use client";

// react
import { useEffect, useState } from "react";

// next
import Image from "next/image";
import { useRouter } from "next/navigation";

// types
import { Livestream } from "@/types";

export function LiveChannels() {
  const router = useRouter();

  const [livestreams, setLivestreams] = useState<Livestream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLivestreams = async () => {
      const livestreamsResponse = await fetch("/api/lives-landing");
      const livestreams = await livestreamsResponse.json();

      console.log("livestreams", livestreams.data);
      setLivestreams(livestreams.data);
      setLoading(false);
    };

    fetchLivestreams();
  }, []);

  return (
    <div className="w-full px-6 py-8 bg-black/50 backdrop-blur-sm border-t border-white/10 rounded-xl">
      <h2 className="text-xl font-semibold text-white mb-4">
        Live channels I think you&apos;ll like
      </h2>

      <div className="flex max-md:flex-col gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {loading ? (
          <>
            <div className="flex flex-col gap-2">
              <div className="hidden md:block flex-none w-full md:w-80 animate-pulse bg-gray-700 rounded-lg h-[180px]" />
              <div className="hidden md:block flex-none w-full md:w-56 animate-pulse bg-gray-700 rounded-lg h-5" />
              <div className="hidden md:block flex-none w-full md:w-20 animate-pulse bg-gray-700 rounded-lg h-3" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="hidden md:block flex-none w-full md:w-80 animate-pulse bg-gray-700 rounded-lg h-[180px]" />
              <div className="hidden md:block flex-none w-full md:w-56 animate-pulse bg-gray-700 rounded-lg h-5" />
              <div className="hidden md:block flex-none w-full md:w-20 animate-pulse bg-gray-700 rounded-lg h-3" />
            </div>
            <div className="flex flex-col gap-2">
              <div className="hidden md:block flex-none w-full md:w-80 animate-pulse bg-gray-700 rounded-lg h-[180px]" />
              <div className="hidden md:block flex-none w-full md:w-56 animate-pulse bg-gray-700 rounded-lg h-5" />
              <div className="hidden md:block flex-none w-full md:w-20 animate-pulse bg-gray-700 rounded-lg h-3" />
            </div>
          </>
        ) : (
          livestreams?.map((livestream) => (
            <div
              key={livestream.livepeerInfo.streamId}
              className="flex-none w-full md:w-80 cursor-pointer"
              onClick={() => router.push(`/token/${livestream.tokenAddress}`)}
            >
              <div className="relative group transition-transform duration-300 ease-out hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
                <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
                  <p className="font-black">LIVE</p>
                </div>

                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                  {new Intl.NumberFormat().format(livestream.userCount)} viewers
                </div>

                <Image
                  src="/assets/landing/siri.jpg"
                  alt="Billi"
                  width={300}
                  height={169}
                  className="w-full aspect-video object-cover rounded-lg"
                />
              </div>

              <div className="mt-2">
                <h3 className="text-white font-medium truncate">
                  {livestream.title}
                </h3>

                <p className="text-gray-400 text-sm truncate">
                  <a
                    href="https://warpcast.com/justbilli"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-300"
                  >
                    @{livestream.handle}
                  </a>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
