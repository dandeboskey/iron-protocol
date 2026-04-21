import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        iron: {
          50: "#f7f7f8",
          100: "#eeeef0",
          200: "#d9d9de",
          300: "#b8b8c1",
          400: "#91919f",
          500: "#747484",
          600: "#5d5d6b",
          700: "#4c4c57",
          800: "#41414a",
          900: "#393940",
          950: "#18181b",
        },
        accent: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
        },
      },
    },
  },
  plugins: [],
};
export default config;
