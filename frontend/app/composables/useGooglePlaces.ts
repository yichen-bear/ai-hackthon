/**
 * useGooglePlaces - 載入 Google Maps JavaScript API + Places Autocomplete
 */

const SCRIPT_ID = 'google-maps-script'
let loadPromise: Promise<void> | null = null

export function useGooglePlaces() {
  const config = useRuntimeConfig()
  const apiKey = config.public.googleMapsKey as string

  function loadScript(): Promise<void> {
    if (loadPromise) return loadPromise
    if ((window as any).google?.maps?.places) return Promise.resolve()

    loadPromise = new Promise((resolve, reject) => {
      if (document.getElementById(SCRIPT_ID)) {
        // 等待已載入的 script 完成
        const check = setInterval(() => {
          if ((window as any).google?.maps?.places) { clearInterval(check); resolve() }
        }, 100)
        return
      }
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=zh-TW`
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Maps'))
      document.head.appendChild(script)
    })
    return loadPromise
  }

  /**
   * 綁定 Autocomplete 到 input 元素
   */
  async function initAutocomplete(
    inputEl: HTMLInputElement,
    onSelect: (place: { name: string; address: string; lat: number; lng: number }) => void,
  ) {
    await loadScript()
    const autocomplete = new (window as any).google.maps.places.Autocomplete(inputEl, {
      componentRestrictions: { country: 'tw' },
      fields: ['formatted_address', 'geometry', 'name'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place?.geometry) {
        onSelect({
          name: place.name || '',
          address: place.formatted_address || inputEl.value,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        })
      }
    })
    return autocomplete
  }

  /**
   * 產生靜態地圖 Embed URL（標記位置）
   */
  function getMapEmbedUrl(address: string): string {
    return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(address)}&language=zh-TW&zoom=15`
  }

  return { loadScript, initAutocomplete, getMapEmbedUrl }
}
