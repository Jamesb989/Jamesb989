/** @type {import('next').NextConfig} */
/** Next.js config — ESLint disabled during builds + middleware matcher enabled */

module.exports = {
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Apply middleware to all routes except internal (_next), APIs, and static assets
    matcher: [
      '/((?!_next|api|favicon.ico).*)',
    ],
  };
  