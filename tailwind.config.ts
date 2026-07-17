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
        // Grafito = base / autoridad · Cobre = acento premium
        grafito: {
          DEFAULT: "var(--grafito)",
          oscuro: "var(--grafito-oscuro)",
          suave: "var(--grafito-suave)",
        },
        cobre: "var(--cobre)",
        // Alias heredado para no romper clases existentes
        bosque: {
          DEFAULT: "var(--grafito)",
          oscuro: "var(--grafito-oscuro)",
          suave: "var(--grafito-suave)",
        },
        laton: "var(--cobre)",
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
