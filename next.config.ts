import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @xenova/transformers and its onnx runtime are native/heavy — keep them out of
  // the bundle so they run from node_modules on the server.
  serverExternalPackages: ["@xenova/transformers"],
};

export default nextConfig;
