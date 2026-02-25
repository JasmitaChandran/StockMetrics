const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Force browser auth bundle; avoids Firebase node auth path (undici) in this Next.js setup.
      'firebase/auth$': path.resolve(__dirname, 'node_modules/firebase/auth/dist/esm/index.esm.js'),
      '@firebase/auth$': path.resolve(
        __dirname,
        'node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js',
      ),
    };
    return config;
  },
};

module.exports = nextConfig;
