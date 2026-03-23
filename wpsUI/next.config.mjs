// @ts-check

/**
 * @type {import('next').NextConfig}
 */

const nextConfig = {
    // standalone solo en producción — evita overhead en dev
    ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
    // reactStrictMode desactivado: en dev causaría doble-mount de efectos
    // y por tanto dos conexiones WebSocket simultáneas al ViewerLens.
    reactStrictMode: false,
    images: {
      unoptimized: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
}

export default nextConfig
