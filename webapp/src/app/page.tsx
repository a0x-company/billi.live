import { StreamCard } from "@/components/stream/stream-card";

export default function Home() {
  return (
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
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold text-white">
            Hola, soy <span className="text-purple-500">Billi</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
            Tu asistente personal para descubrir las mejores transmisiones en
            vivo
          </p>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
              Comenzar a transmitir
            </button>
            <button className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium backdrop-blur-sm transition-colors">
              Explorar streams
            </button>
          </div>
        </div>

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
  );
}

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
