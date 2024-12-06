import Image from "next/image";

export function LiveChannels() {
  return (
    <div className="w-full px-6 py-8">
      <h2 className="text-xl font-semibold text-white mb-4">
        Live channels we think you&apos;ll like
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        <div className="flex-none w-80">
          <div className="relative group">
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
        </div>

        <div className="flex-none w-80">
          <div className="relative group">
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
        </div>
      </div>
    </div>
  );
}
