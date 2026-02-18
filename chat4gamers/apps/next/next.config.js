/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Added for Electron
  images: { unoptimized: true }, // Added for Electron
  assetPrefix: './',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    'solito',
    'react-native-web',
    'tamagui', // Make sure tamagui is here
    '@my/ui',   // Make sure your UI package is here
    '@tamagui/react-native-svg',
    '@tamagui/next-theme',
    '@tamagui/lucide-icons',
    'expo-linking',
    'expo-constants',
    'expo-modules-core',
  ],
  experimental: {
    scrollRestoration: true,
  },
  turbopack: {
    resolveAlias: {
      'react-native': 'react-native-web',
      'react-native-svg': '@tamagui/react-native-svg',
      'react-native-safe-area-context': './shims/react-native-safe-area-context.js',
    },
    resolveExtensions: [
      '.web.tsx', '.web.ts', '.web.js', '.web.jsx',
      '.tsx', '.ts', '.js', '.jsx', '.json',
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    }
    config.resolve.extensions = [
      '.web.tsx', '.web.ts', '.web.js', '.web.jsx',
      ...config.resolve.extensions,
    ]
    return config
  },
}

export default nextConfig // <--- Use this instead of module.exports