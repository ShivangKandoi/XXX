/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configure video optimization
  optimizeImages: true,
  optimizeFonts: true,
  // Configure video compression and caching
  async headers() {
    return [
      {
        source: '/intro.mp4',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig 