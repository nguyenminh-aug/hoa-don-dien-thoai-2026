import { createServer } from 'vite'

const hostIndex = process.argv.indexOf('--host')
const host = hostIndex >= 0 ? process.argv[hostIndex + 1] : '127.0.0.1'

const server = await createServer({ server: { host } })
await server.listen()
server.printUrls()
