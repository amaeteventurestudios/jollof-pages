import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jollof: {
          black: "#0a0800",
          dark: "#0f0d08",
          surface: "#161209",
          panel: "#1c1608",
          border: "#2a1f08",
          muted: "#3d2e0e",
          orange: "#f97316",
          amber: "#f59e0b",
          glow: "#ea580c",
          dim: "#92400e",
          text: "#fef3c7",
          subtext: "#a8956b",
          label: "#6b5a3a",
        },
      },
      backgroundImage: {
        "jollof-radial":
          "radial-gradient(ellipse at 50% 0%, #2a1500 0%, #0a0800 60%)",
        "jollof-card":
          "linear-gradient(135deg, #1c1608 0%, #120e05 100%)",
      },
      boxShadow: {
        "jollof-glow": "0 0 20px rgba(249, 115, 22, 0.15)",
        "jollof-border": "0 0 0 1px rgba(249, 115, 22, 0.2)",
        "jollof-card": "0 2px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(42,31,8,0.8)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          from: { boxShadow: "0 0 4px rgba(249, 115, 22, 0.3)" },
          to: { boxShadow: "0 0 12px rgba(249, 115, 22, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
