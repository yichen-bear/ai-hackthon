export default defineEventHandler(async (event) => {
  const target = `http://localhost:3001${event.path}`
  return proxyRequest(event, target)
})
