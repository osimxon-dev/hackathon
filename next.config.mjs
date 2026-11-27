/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pg — Node.js drayveri, uni bundlega qo'shmasdan tashqi paket sifatida ishlatamiz
  serverExternalPackages: ['pg'],
  poweredByHeader: false,
};

export default nextConfig;
