import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGeolocation } from '../useGeolocation'
import { nextTick } from 'vue'

// Mock $fetch globally (Nuxt auto-import)
const mockFetch = vi.fn()
;(globalThis as any).$fetch = mockFetch

describe('useGeolocation', () => {
  let originalNavigator: any

  beforeEach(() => {
    vi.clearAllMocks()
    originalNavigator = globalThis.navigator
  })

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('初始狀態顯示「定位中...」', () => {
    // Mock geolocation that never resolves
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn(), // never calls callback
        },
      },
      writable: true,
      configurable: true,
    })

    const { location } = useGeolocation()
    expect(location.value).toBe('定位中...')
  })

  it('成功取得座標後顯示行政區名稱', async () => {
    const mockPosition: GeolocationPosition = {
      coords: {
        latitude: 25.033,
        longitude: 121.5654,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    }

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((success) => {
            success(mockPosition)
          }),
        },
      },
      writable: true,
      configurable: true,
    })

    mockFetch.mockResolvedValueOnce({
      address: {
        city: '台北市',
        town: '信義區',
      },
    })

    const { location } = useGeolocation()

    // Wait for async operations
    await vi.waitFor(() => {
      expect(location.value).toBe('台北市信義區')
    })
  })

  it('使用 county 作為縣市名稱的 fallback', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((success) => {
            success({
              coords: { latitude: 24.15, longitude: 120.67 },
              timestamp: Date.now(),
            })
          }),
        },
      },
      writable: true,
      configurable: true,
    })

    mockFetch.mockResolvedValueOnce({
      address: {
        county: '台中市',
        district: '西區',
      },
    })

    const { location } = useGeolocation()

    await vi.waitFor(() => {
      expect(location.value).toBe('台中市西區')
    })
  })

  it('瀏覽器不支援 Geolocation 時顯示「未設定位置」', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })

    const { location } = useGeolocation()

    await vi.waitFor(() => {
      expect(location.value).toBe('未設定位置')
    })
  })

  it('使用者拒絕定位權限時顯示「未設定位置」', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((_success, error) => {
            error(new GeolocationPositionError())
          }),
        },
      },
      writable: true,
      configurable: true,
    })

    const { location } = useGeolocation()

    await vi.waitFor(() => {
      expect(location.value).toBe('未設定位置')
    })
  })

  it('Geolocation API 逾時時顯示「未設定位置」', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((_success, error) => {
            error({ code: 3, message: 'Timeout' })
          }),
        },
      },
      writable: true,
      configurable: true,
    })

    const { location } = useGeolocation()

    await vi.waitFor(() => {
      expect(location.value).toBe('未設定位置')
    })
  })

  it('反向地理編碼 API 失敗時顯示「未設定位置」', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((success) => {
            success({
              coords: { latitude: 25.0, longitude: 121.5 },
              timestamp: Date.now(),
            })
          }),
        },
      },
      writable: true,
      configurable: true,
    })

    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { location } = useGeolocation()

    await vi.waitFor(() => {
      expect(location.value).toBe('未設定位置')
    })
  })

  it('反向地理編碼回傳無法解析的結果時顯示「未設定位置」', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((success) => {
            success({
              coords: { latitude: 25.0, longitude: 121.5 },
              timestamp: Date.now(),
            })
          }),
        },
      },
      writable: true,
      configurable: true,
    })

    mockFetch.mockResolvedValueOnce({ address: {} })

    const { location } = useGeolocation()

    await vi.waitFor(() => {
      expect(location.value).toBe('未設定位置')
    })
  })

  it('refresh() 重新取得定位', async () => {
    let callCount = 0

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((success) => {
            callCount++
            success({
              coords: { latitude: 25.0, longitude: 121.5 },
              timestamp: Date.now(),
            })
          }),
        },
      },
      writable: true,
      configurable: true,
    })

    mockFetch.mockResolvedValue({
      address: {
        city: '台北市',
        town: '大安區',
      },
    })

    const { location, refresh } = useGeolocation()

    await vi.waitFor(() => {
      expect(location.value).toBe('台北市大安區')
    })

    expect(callCount).toBe(1)

    refresh()

    // After refresh, it should first show loading, then resolve
    await vi.waitFor(() => {
      expect(callCount).toBe(2)
      expect(location.value).toBe('台北市大安區')
    })
  })

  it('呼叫 $fetch 時使用正確的 URL 與參數', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        geolocation: {
          getCurrentPosition: vi.fn((success) => {
            success({
              coords: { latitude: 25.033, longitude: 121.5654 },
              timestamp: Date.now(),
            })
          }),
        },
      },
      writable: true,
      configurable: true,
    })

    mockFetch.mockResolvedValueOnce({
      address: { city: '台北市', town: '信義區' },
    })

    useGeolocation()

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://nominatim.openstreetmap.org/reverse?format=json&lat=25.033&lon=121.5654&accept-language=zh-TW'
      )
    })
  })
})
