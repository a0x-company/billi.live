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
      {/* Left navigation */}
      <nav className="w-64 bg-black/80 backdrop-blur-sm border-r border-white/10 h-screen fixed left-0 top-0">
        <div className="p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              <span className="text-purple-500">Billi</span>
            </h2>
          </div>

          {/* Navigation list */}
          <ul className="space-y-4">
            <li>
              <a
                href="/"
                className="flex items-center text-white hover:text-purple-500 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Inicio
              </a>
            </li>

            {navigationItems.map((item, index) => (
              <li key={index}>
                <a
                  href={item.path}
                  className="flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main content with margin for both columns */}
      <main className="flex-1 ml-64">
        <section className="relative min-h-screen">
          {/* Background video with overlay */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/60 z-10" />{" "}
            <video
              src="/assets/landing/static.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Main content */}
          <div className="relative z-20 container mx-auto px-4 py-20">
            <BilliPresentation />

            <LiveChannels />
          </div>

          {/* Footer - ahora dentro de la sección con el video */}
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <footer className="bg-black/80 backdrop-blur-sm border-t border-white/10 py-4">
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
