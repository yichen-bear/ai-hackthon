export default defineEventHandler(async (event) => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
  const target = `${backendUrl}${event.path}`
  return proxyRequest(event, target)
})
