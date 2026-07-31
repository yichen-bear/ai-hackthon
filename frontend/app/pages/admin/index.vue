<script setup lang="ts">
definePageMeta({ layout: "admin" });

interface ModuleCard {
	key: string;
	label: string;
	description: string;
	route: string;
	color: string;
}

const modules: ModuleCard[] = [
	{
		key: "food",
		label: "食",
		description: "餐飲廠商管理",
		route: "/admin/food",
		color: "#f97316",
	},
	{
		key: "medical",
		label: "醫",
		description: "醫療廠商管理",
		route: "/admin/medical",
		color: "#06b6d4",
	},
	{
		key: "housing",
		label: "住",
		description: "住宿廠商管理",
		route: "/admin/housing",
		color: "#8b5cf6",
	},
];
</script>

<template>
	<div class="admin-home">
		<h1 class="admin-home__title">後台管理</h1>
		<p class="admin-home__subtitle">選擇模組開始管理</p>

		<div class="admin-home__grid">
			<NuxtLink
				v-for="mod in modules"
				:key="mod.key"
				:to="mod.route"
				class="admin-home__card"
			>
				<span
					class="admin-home__card-icon"
					:style="{ backgroundColor: mod.color }"
					aria-hidden="true"
				>
					{{ mod.label }}
				</span>
				<span class="admin-home__card-label">{{ mod.label }}</span>
				<span class="admin-home__card-desc">{{ mod.description }}</span>
			</NuxtLink>
		</div>
	</div>
</template>

<style scoped>
.admin-home {
	max-width: 430px;
  margin: 0 auto;
  width: 100%;
  padding: 16px
}

.admin-home__title {
	font-size: 22px;
	font-weight: 700;
	color: var(--color-text-primary, #1c1917);
	margin: 0 0 4px 0;
}

.admin-home__subtitle {
	font-size: var(--text-sm, 13px);
	color: var(--color-text-secondary, #78716c);
	margin: 0 0 var(--space-6, 24px) 0;
}

.admin-home__grid {
	display: flex;
	flex-direction: column;
	gap: var(--space-4, 16px);
}

.admin-home__card {
	display: flex;
	align-items: center;
	gap: var(--space-4, 16px);
	padding: var(--space-5, 20px);
	background-color: var(--color-bg-card, #ffffff);
	border: 1px solid var(--color-border, #e2e8f0);
	border-radius: var(--radius-md, 12px);
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
	text-decoration: none;
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;
}

.admin-home__card:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.admin-home__card:active {
	transform: translateY(0);
}

.admin-home__card-icon {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	font-weight: 700;
	color: #ffffff;
	flex-shrink: 0;
}

.admin-home__card-label {
	font-size: 18px;
	font-weight: 600;
	color: var(--color-text-primary, #1c1917);
}

.admin-home__card-desc {
	font-size: var(--text-sm, 13px);
	color: var(--color-text-secondary, #78716c);
	margin-left: auto;
}
</style>
