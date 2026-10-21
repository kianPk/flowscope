import express from 'express'
import cors from 'cors'
import { randomUUID } from 'crypto'

const PORT = process.env.PORT || 8820
const app = express()
app.use(cors())
app.use(express.json())

const PROTO = ['TCP', 'UDP', 'HTTPS', 'DNS', 'SSH']
const APPS = ['api-gateway', 'vpn-hub', 'ci-runner', 'db-primary', 'edge-waf', 'dns-resolver']
const flows = []

function seed() {
  for (let i = 0; i < 48; i++) {
    const proto = PROTO[i % PROTO.length]
    const bytes = Math.floor(200 + Math.random() * 2_000_000)
    flows.push({
      id: randomUUID().slice(0, 8),
      src: `10.${1 + (i % 4)}.${(i * 7) % 200}.${10 + (i % 40)}`,
      dst: APPS[i % APPS.length],
      dstIp: `10.8.${i % 12}.${20 + (i % 30)}`,
      proto,
      port: proto === 'DNS' ? 53 : proto === 'SSH' ? 22 : proto === 'HTTPS' ? 443 : 8000 + (i % 90),
      bytes,
      packets: Math.floor(bytes / (200 + Math.random() * 800)),
      threat: i % 11 === 0 ? 'suspicious' : i % 17 === 0 ? 'blocked' : 'ok',
      startedAt: Date.now() - i * 45_000 - Math.floor(Math.random() * 20_000),
      durationMs: 200 + Math.floor(Math.random() * 12_000),
    })
  }
}
seed()

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'flowscope' }))
app.get('/api/flows', (req, res) => {
  let list = [...flows]
  if (req.query.threat) list = list.filter((f) => f.threat === req.query.threat)
  if (req.query.proto) list = list.filter((f) => f.proto === req.query.proto)
  list.sort((a, b) => b.startedAt - a.startedAt)
  res.json({ flows: list.slice(0, 100) })
})
app.get('/api/summary', (_req, res) => {
  const bytes = flows.reduce((s, f) => s + f.bytes, 0)
  res.json({
    flows: flows.length,
    bytes,
    suspicious: flows.filter((f) => f.threat === 'suspicious').length,
    blocked: flows.filter((f) => f.threat === 'blocked').length,
    topTalkers: Object.entries(
      flows.reduce((m, f) => {
        m[f.dst] = (m[f.dst] || 0) + f.bytes
        return m
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, b]) => ({ name, bytes: b })),
  })
})

app.listen(PORT, () => console.log(`flowscope on :${PORT}`))
