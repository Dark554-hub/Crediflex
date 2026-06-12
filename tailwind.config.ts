import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Aptos",
          "Segoe UI",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      colors: {
        field: "#F6FBF7",
        ink: "#0E3B2E",
        moss: "#1F6F54",
        maize: "#5FB88A",
        mint: "#D7E7DD",
        clay: "#0E3B2E",
        line: "#D7E7DD",
      },
      boxShadow: {
        lift: "0 10px 24px rgba(14, 59, 46, 0.10)",
        soft: "0 2px 8px rgba(14, 59, 46, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
