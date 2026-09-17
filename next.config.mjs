/** @type {import('next').NextConfig} */

/* Response headers every page carries. Vercel adds Strict-Transport-Security
   on a custom domain by itself; the rest were absent from the live site, so a
   page here could be framed by any other site, a browser could sniff a
   response into a different type, and a full URL went out in the Referer to
   every external link. None of these needs a nonce or touches inline scripts.
   A Content-Security-Policy is the one deliberately left out: the theme
   script in layout.tsx is inline, so a real CSP needs a per-request nonce,
   and that is its own piece of work. */
const securityHeaders = [
  // Nobody may put this site in an <iframe>.
  { key: "X-Frame-Options", value: "DENY" },
  // A response is what its Content-Type says, never guessed from the bytes.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites see only the origin, not which word someone was reading.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The recorder needs the microphone, on this origin only; nothing here
  // needs the camera, location, or payment APIs, so they are switched off.
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
