/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@iron-protocol/api-client",
    "@iron-protocol/api-contract",
    "@iron-protocol/core-logic",
    "@iron-protocol/db",
  ],
};
module.exports = nextConfig;
