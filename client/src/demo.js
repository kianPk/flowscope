const PROTO = ['TCP', 'UDP', 'HTTPS', 'DNS', 'SSH']
const APPS = ['api-gateway', 'vpn-hub', 'ci-runner', 'db-primary', 'edge-waf', 'dns-resolver']

export function seedFlows() {
  const flows = []
  for (let i = 0; i < 48; i++) {
    const proto = PROTO[i % PROTO.length]
    const bytes = Math.floor(200 + Math.random() * 2_000_000)
    flows.push({
      id: 'f' + i,
      src: `10.${1 + (i % 4)}.${(i * 7) % 200}.${10 + (i % 40)}`,
      dst: APPS[i % APPS.length],
      dstIp: `10.8.${i % 12}.${20 + (i % 30)}`,
      proto,
      port: proto === 'DNS' ? 53 : proto === 'SSH' ? 22 : proto === 'HTTPS' ? 443 : 8000 + (i % 90),
      bytes,
      packets: Math.floor(bytes / (200 + Math.random() * 800)),
      threat: i % 11 === 0 ? 'suspicious' : i % 17 === 0 ? 'blocked' : 'ok',
      startedAt: Date.now() - i * 45_000,
      durationMs: 200 + Math.floor(Math.random() * 12_000),
    })
  }
  return flows
}

export function fmtBytes(n) {
  if (n > 1e6) return (n / 1e6).toFixed(1) + ' MB'
  if (n > 1e3) return (n / 1e3).toFixed(1) + ' KB'
  return n + ' B'
}
