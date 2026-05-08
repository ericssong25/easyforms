/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "@sparticuz/chromium-min",
      "puppeteer-core",
      "puppeteer",
    ],
  },
};

export default nextConfig;
