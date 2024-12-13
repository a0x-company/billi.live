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

  useEffect(() => {
    const fetchLivestreams = async () => {
      const livestreamsResponse = await fetch("/api/lives-landing");
      const livestreams = await livestreamsResponse.json();

      console.log("livestreams", livestreams.data);
      setLivestreams(livestreams.data);
    };

    fetchLivestreams();
  }, []);

  console.log("livestreams", livestreams);

  return (
    <div className="w-full px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-4">
        Live channels I think you&apos;ll like
      </h2>

      <div className="flex max-md:flex-col gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {livestreams?.map((livestream) => (
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
        ))}

        {/* <div
          className="flex-none w-80 cursor-pointer"
          onClick={() =>
            router.push(`/token/0x33a2c4a426a4e866def7996ffa93fbee6d397eb8`)
          }
        >
          <div className="relative group transition-transform duration-300 ease-out hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
              <p className="font-black">LIVE</p>
            </div>

            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
              {new Intl.NumberFormat().format(1234)} viewers
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
              Distortion of the space
            </h3>

            <p className="text-gray-400 text-sm truncate">
              <a
                href="https://warpcast.com/justbilli"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                @justbilli
              </a>
            </p>
          </div>
        </div> */}

        {/* <div
          className="flex-none w-80 cursor-pointer"
          onClick={() =>
            router.push(`/token/0x1bc0c42215582d5a085795f4badbac3ff36d1bcb`)
          }
        >
          <div className="relative group transition-transform duration-300 ease-out hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20">
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
              <p className="font-black">LIVE</p>
            </div>

            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
              {new Intl.NumberFormat().format(1)} viewers
            </div>

            <Image
              src="/assets/landing/clanker.svg"
              alt="Clanker"
              width={300}
              height={169}
              className="w-full aspect-video object-cover rounded-lg"
            />
          </div>

          <div className="mt-2">
            <h3 className="text-white font-medium truncate">??</h3>

            <p className="text-gray-400 text-sm truncate">
              <a
                href="https://warpcast.com/clanker"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300"
              >
                @clanker
              </a>
            </p>
          </div>
        </div> */}
      </div>
    </div>
  );
}
