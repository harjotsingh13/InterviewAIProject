import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_API_URL: "https://interviewai-backend-6zpu.onrender.com",
  },
};

export default nextConfig;
