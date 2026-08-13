/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the /content markdown files ship with the serverless function.
  outputFileTracingIncludes: {
    "/api/mcp": ["./content/**", "./public/logos/**"],
  },
};
module.exports = nextConfig;
