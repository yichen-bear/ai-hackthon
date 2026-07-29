// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },
	modules: ["@nuxtjs/tailwindcss"],
	css: ["~/assets/css/design-system.css"],
	tailwindcss: {
		configPath: "tailwind.config.ts",
	},
	// 開發環境將 /api/** 轉發至 Express 後端 (http://localhost:3001)
	// 讓前端 $fetch('/api/...') 實際打到後端，而不是 Nuxt 自身的 server route
	routeRules: {
		"/api/**": { proxy: "http://localhost:3001/api/**" },
	},
});
