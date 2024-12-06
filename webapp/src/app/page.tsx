// components
import { BilliPresentation } from "@/components/landing/BilliPresentation";

export default function Home() {
  return (
    <div className="flex min-h-screen">
      {/* Navegación izquierda */}
      <nav className="w-64 bg-black/80 backdrop-blur-sm border-r border-white/10 h-screen fixed left-0 top-0">
        <div className="p-6">
          {/* Logo/Home */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white">
              <span className="text-purple-500">Billi</span>
            </h2>
          </div>

          {/* Lista de navegación */}
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

      {/* Contenido principal con margen para ambas columnas */}
      <main className="flex-1 ml-64">
        <section className="relative min-h-screen">
          {/* Video de fondo con overlay */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/50 z-10" />{" "}
            {/* Overlay oscuro */}
            <video
              src="/assets/landing/static.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Contenido principal */}
          <div className="relative z-20 container mx-auto px-4 py-20">
            <BilliPresentation />

            {/* Sección de características */}
            <div className="grid md:grid-cols-3 gap-8 mt-20">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-sm p-6 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300">{feature.description}</p>
                </div>
              ))}
            </div>
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
