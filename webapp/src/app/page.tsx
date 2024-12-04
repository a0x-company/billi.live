import { StreamCard } from "@/components/stream/stream-card";

const MOCK_STREAMS = [
  {
    id: "1",
    title: "Building a Full-Stack App with React and Node.js",
    description: "Join me as we build a complete web application from scratch!",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
    streamerName: "TechPro",
    viewerCount: 1234,
    isLive: true,
    startedAt: new Date(),
  },
  {
    id: "2",
    title: "Late Night Gaming Session - Join the Fun!",
    description: "Playing the latest releases and chatting with viewers",
    thumbnailUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e",
    streamerName: "GameMaster",
    viewerCount: 856,
    isLive: true,
    startedAt: new Date(),
  },
];

export default function Home() {
  return (
    <section className="py-8">
      <h1 className="text-2xl text-white font-bold mb-6">Live Streams</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_STREAMS.map((stream) => (
          <StreamCard key={stream.id} stream={stream} />
        ))}
      </div>
    </section>
  );
}
