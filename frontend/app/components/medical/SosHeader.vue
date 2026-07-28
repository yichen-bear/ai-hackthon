<script setup lang="ts">
import { ref, onMounted } from 'vue'

/* ─── Props ─── */
interface SosHeaderProps {
  emergencyContact?: string // 緊急聯絡人電話號碼，未設定時隱藏/禁用按鈕
}

const props = defineProps<SosHeaderProps>()

/* ─── 內部狀態 ─── */
const gpsCoords = ref<{ lat: number; lng: number } | null>(null)
const gpsError = ref<boolean>(false)

/* ─── 生命週期：取得 GPS 座標 ─── */
onMounted(() => {
  if (!navigator.geolocation) {
    gpsError.value = true
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      gpsCoords.value = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
    },
    () => {
      gpsError.value = true
    },
    { timeout: 10000 }
  )
})
</script>

<template>
  <section class="mc__sos" aria-label="緊急求助區塊">
    <!-- 標題 -->
    <h2 class="mc__sos-title">🚨 緊急求助</h2>

    <!-- GPS 座標顯示 -->
    <p class="mc__sos-gps">
      <template v-if="gpsCoords">
        📍 {{ gpsCoords.lat.toFixed(4) }}, {{ gpsCoords.lng.toFixed(4) }}
      </template>
      <template v-else-if="gpsError">
        📍 無法取得位置
      </template>
      <template v-else>
        📍 定位中...
      </template>
    </p>

    <!-- 行動按鈕區 -->
    <div class="mc__sos-actions">
      <!-- 撥打 119 按鈕 -->
      <a
        href="tel:119"
        class="mc__sos-btn mc__sos-btn--primary"
        aria-label="撥打 119 急救電話"
      >
        📞 撥打119
      </a>

      <!-- 緊急聯絡人按鈕 -->
      <a
        v-if="props.emergencyContact"
        :href="`tel:${props.emergencyContact}`"
        class="mc__sos-btn mc__sos-btn--secondary"
        aria-label="撥打緊急聯絡人電話"
      >
        👤 緊急聯絡人
      </a>
      <button
        v-else
        class="mc__sos-btn mc__sos-btn--secondary mc__sos-btn--disabled"
        disabled
        aria-label="尚未設定緊急聯絡人"
      >
        👤 未設定聯絡人
      </button>
    </div>
  </section>
</template>

<style scoped>
/* ── SOS 區塊容器 ── */
.mc__sos {
  background-color: #fef2f2;
  background-color: var(--color-accent-red-light, #fef2f2);
  border-radius: 16px;
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  box-shadow: var(--shadow-card, 0 1px 4px rgba(0, 0, 0, 0.06));
  padding: 16px;
  padding: var(--space-4, 16px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  gap: var(--space-3, 12px);
  border: 1.5px solid #fca5a5;
}

/* ── 標題 ── */
.mc__sos-title {
  margin: 0;
  font-size: 17px;
  font-size: var(--text-lg, 17px);
  font-weight: 700;
  color: #dc2626;
}

/* ── GPS 座標文字 ── */
.mc__sos-gps {
  margin: 0;
  font-size: 13px;
  font-size: var(--text-sm, 13px);
  color: #1c1917;
  color: var(--color-text-primary, #1c1917);
}

/* ── 行動按鈕區 ── */
.mc__sos-actions {
  display: flex;
  gap: 12px;
  gap: var(--space-3, 12px);
  flex-wrap: wrap;
}

/* ── 按鈕共用 ── */
.mc__sos-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  padding: 12px 20px;
  padding: var(--space-3, 12px) var(--space-5, 20px);
  border-radius: 12px;
  border-radius: var(--radius-md, 12px);
  font-size: 15px;
  font-size: var(--text-base, 15px);
  font-weight: 600;
  font-family: inherit;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s, transform 0.1s;
  flex: 1;
  text-align: center;
}

.mc__sos-btn:active {
  transform: scale(0.97);
}

/* ── 主要按鈕（撥打 119） ── */
.mc__sos-btn--primary {
  background-color: #dc2626;
  color: #ffffff;
}

.mc__sos-btn--primary:hover {
  opacity: 0.9;
}

/* ── 次要按鈕（緊急聯絡人） ── */
.mc__sos-btn--secondary {
  background-color: #ffffff;
  color: #dc2626;
  border: 1.5px solid #dc2626;
}

.mc__sos-btn--secondary:hover {
  background-color: #fef2f2;
}

/* ── 禁用狀態 ── */
.mc__sos-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #78716c;
  color: var(--color-text-secondary, #78716c);
  border-color: #e2e8f0;
  border-color: var(--color-border, #e2e8f0);
}

.mc__sos-btn--disabled:hover {
  background-color: #ffffff;
}
</style>
