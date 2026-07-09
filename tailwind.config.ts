import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fondo: "var(--fondo)",
        superficie: "var(--superficie)",
        tinta: "var(--tinta)",
        neutro: "var(--neutro)",
        linea: "var(--linea)",
        bosque: {
          DEFAULT: "var(--bosque)",
          oscuro: "var(--bosque-oscuro)",
          suave: "var(--bosque-suave)",
        },
        laton: "var(--laton)",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
