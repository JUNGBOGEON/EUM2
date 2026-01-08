import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  // React 19와 Chime SDK 호환성을 위한 설정
  transpilePackages: ['amazon-chime-sdk-component-library-react'],
};

export default nextConfig;
