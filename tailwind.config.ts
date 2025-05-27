import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
				DEFAULT: '#111827',
				gradient: 'linear-gradient(90deg, #111827 100%, #000000 100%)',
			},

			accent: {
				DEFAULT: '#3707FC',
				hover: '#3707FC',
			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  		},
		screens: {
			sm: '640px',
			md: '768px',
			lg: '960px',
			xl: '1200px',
	
		},
		fontFamily: {
			primary: "var(--font-bai-jamjuree)",
		},

  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
