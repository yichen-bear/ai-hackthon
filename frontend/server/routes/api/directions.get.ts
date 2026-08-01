/**
 * Google Directions API Proxy
 * 前端透過此 route 取得真實路線 JSON（避免 CORS 和金鑰暴露）
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { origin, destination, mode } = query as { origin: string; destination: string; mode: string }

  if (!origin || !destination) {
    throw createError({ statusCode: 400, message: 'origin and destination are required' })
  }

  const apiKey = process.env.NUXT_PUBLIC_GOOGLE_MAPS_KEY || ''
  if (!apiKey) {
    throw createError({ statusCode: 500, message: 'Google Maps API key not configured' })
  }

  const travelMode = mode || 'transit'
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${travelMode}&language=zh-TW&key=${apiKey}`

  try {
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK') {
      return { routes: [], status: data.status, error_message: data.error_message }
    }

    return data
  } catch (e: any) {
    throw createError({ statusCode: 502, message: `Directions API error: ${e.message}` })
  }
})
