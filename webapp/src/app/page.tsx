// next
import Image from "next/image";

// components
import { BilliPresentation } from "@/components/landing/BilliPresentation";
import { LiveChannels } from "@/components/landing/LiveChannels";

// icons
import { PiChartLineUpBold } from "react-icons/pi";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      {/* Main content with margin for both columns */}
      <main className="flex-1 max-md:max-w-full">
        <section className="relative min-h-screen">
          {/* Background video with overlay */}
          {/* <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/60 z-10" />{" "}
            <video
              src="/assets/landing/static.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div> */}

          {/* Main content */}
          <div className="relative z-20 container mx-auto px-4 py-20 gap-4">
            <BilliPresentation />

            <LiveChannels />
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20">
            <footer className="border-t border-white/10 py-4">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-center space-x-6">
                  {/* <div className="flex flex-row gap-[5px] max-md:w-1/3 items-center justify-center">
                    <div className="text-white">
                      <PiTelevisionSimpleFill style={{ color: "inherit" }} />
                    </div>

                    <a
                      href="https://www.coingecko.com/en/coins/zurf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-[12px] font-base"
                    >
                      Vision
                    </a>
                  </div> */}

                  <div className="flex flex-row gap-[5px] max-md:w-1/3 items-center justify-center">
                    <div className="text-white">
                      <PiChartLineUpBold
                        style={{ color: "inherit", fontSize: "20px" }}
                      />
                    </div>

                    <a
                      href="https://dune.com/discover/content/trending"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-[12px] font-base"
                    >
                      Analytics
                    </a>
                  </div>

                  <div className="flex flex-row gap-[5px] max-md:w-1/3 items-center justify-center">
                    <div className="text-white">
                      <Image
                        src="/assets/landing/farcaster.svg"
                        alt="farcaster logo"
                        width={16}
                        height={16}
                      />
                    </div>

                    <a
                      href="https://warpcast.com/justbilli"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white text-[12px] font-base"
                    >
                      Farcaster
                    </a>
                  </div>

                  {/* <a
                    href="/x"
                    className="text-gray-400 hover:text-white text-sm flex items-center"
                  >
                    <span>X</span>
                  </a> */}
                </div>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}

const navigationItems = [
  { name: "Explorar", path: "/explore" },
  { name: "Categorías", path: "/categories" },
  { name: "Siguiendo", path: "/following" },
  { name: "Favoritos", path: "/favorites" },
  { name: "Configuración", path: "/settings" },
];

const features = [
  {
    title: "Streaming en HD",
    description: "Transmite tu contenido en alta calidad con mínima latencia",
  },
  {
    title: "Comunidad activa",
    description: "Únete a una comunidad vibrante de creadores y espectadores",
  },
  {
    title: "Personalización total",
    description: "Personaliza tu canal y transmisión a tu gusto",
  },
];
