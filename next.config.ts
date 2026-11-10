import type { NextConfig } from "next";

// Módulo Cancelamentos do WG Hub: site estático publicado em /cancelamentos (Hostinger),
// com o mesmo login do WG Hub.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/cancelamentos",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
