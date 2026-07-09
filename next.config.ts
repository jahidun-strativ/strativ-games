import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Re-enable the Client Router Cache for dynamic pages. In Next 15+ the
    // `dynamic` default dropped to 0s, so revisiting an already-visited route
    // hit the server every time. Our routes are all dynamic (cookie-based
    // auth), so without this every navigation re-ran auth + DB before render.
    // Mutations still bust the cache via revalidatePath in the Server Actions.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
