// @ts-check

/**
 * @type {import('next').NextConfig}
 */

const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    images: {
      unoptimized: true,
    },
    // output: 'export' removido para permitir API Routes (reemplaza IPC de Electron)
    typescript: {
      ignoreBuildErrors: true,
    },
}

  export default nextConfig