// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },
	modules: ["@nuxtjs/tailwindcss"],
	css: ["~/assets/css/design-system.css", "~/assets/css/admin-common.css"],
	tailwindcss: {
		configPath: "tailwind.config.ts",
	},
	runtimeConfig: {
		public: {
			googleMapsKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_KEY || '',
			apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001',
		},
	},
});
