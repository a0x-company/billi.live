const nextConfig = {
  webpack(config) {
    config.externals.push("pino-pretty");

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
      {
        protocol: "http",
        hostname: "*",
      },
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        port: "",
        pathname: "/*/**",
      },
      {
        hostname: "ik.imagekit.io",
      },
      {
        hostname: "arweave.net",
      },
      {
        hostname: "storage.googleapis.com",
      },
      {
        hostname: "i.imgur.com",
      },
      {
        hostname: "supercast.mypinata.cloud",
      },
      {
        hostname: "i.seadn.io",
      },
    ],
  },
};

export default nextConfig;
