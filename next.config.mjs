/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Una sola política de datos. La ruta vieja sigue funcionando
      // para quien tenga el enlace guardado, pero apunta a la nueva.
      {
        source: "/legal/tratamiento-de-datos",
        destination: "/politica-de-datos",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
