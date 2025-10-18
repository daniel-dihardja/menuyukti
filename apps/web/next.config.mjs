/** @type {import('next').NextConfig} */
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
