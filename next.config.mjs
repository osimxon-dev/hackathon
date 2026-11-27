/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pg — Node.js drayveri, uni bundlega qo'shmasdan tashqi paket sifatida ishlatamiz
  serverExternalPackages: ['pg', 'mongodb'],
  poweredByHeader: false,
  // Eski manzillar registratura paneliga ko'chdi
  async redirects() {
    return [
      { source: '/appointments', destination: '/admin/qabullar', permanent: false },
      { source: '/tablo', destination: '/admin/tablo', permanent: false },
      { source: '/statistika', destination: '/admin', permanent: false },
    ];
  },
};

export default nextConfig;
