/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three", "@react-three/rapier"],
  // Rapier 1.5 compat inlines wasm as base64; keep asset/MIME rules so a
  // future .wasm emit on Vercel is served as application/wasm.
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*.wasm",
        headers: [{ key: "Content-Type", value: "application/wasm" }],
      },
    ];
  },
};

export default nextConfig;
