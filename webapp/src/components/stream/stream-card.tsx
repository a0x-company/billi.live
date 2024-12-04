import React from "react";
import { Users, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";

export interface Stream {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  streamerName: string;
  viewerCount: number;
  isLive: boolean;
  startedAt: Date;
}

interface StreamCardProps {
  stream: Stream;
}

export const StreamCard: React.FC<StreamCardProps> = ({ stream }) => {
  return (
    <Link href={`/token/${stream.id}`} className="group">
      <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md transition-transform group-hover:scale-[1.02]">
        <div className="relative">
          <Image
            width={200}
            height={100}
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="w-full aspect-video object-cover"
          />
          {stream.isLive && (
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1">
              <Video className="w-4 h-4" />
              LIVE
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm font-medium flex items-center gap-1">
            <Users className="w-4 h-4" />
            {stream.viewerCount.toLocaleString()}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg line-clamp-1 dark:text-white">
            {stream.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
            {stream.streamerName}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Started {formatDistanceToNow(stream.startedAt)} ago
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
