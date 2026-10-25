<script setup>
import { computed, ref } from 'vue'
import { seedFlows, fmtBytes } from './demo'

const flows = ref(seedFlows())
const threat = ref('all')
const proto = ref('all')
const selected = ref(null)

const filtered = computed(() => {
  let list = [...flows.value]
  if (threat.value !== 'all') list = list.filter((f) => f.threat === threat.value)
  if (proto.value !== 'all') list = list.filter((f) => f.proto === proto.value)
  return list.sort((a, b) => b.startedAt - a.startedAt)
})

const summary = computed(() => {
  const bytes = flows.value.reduce((s, f) => s + f.bytes, 0)
  const top = Object.entries(
    flows.value.reduce((m, f) => {
      m[f.dst] = (m[f.dst] || 0) + f.bytes
      return m
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  return {
    flows: flows.value.length,
    bytes,
    suspicious: flows.value.filter((f) => f.threat === 'suspicious').length,
    blocked: flows.value.filter((f) => f.threat === 'blocked').length,
    top,
  }
})

function ago(ts) {
  const m = Math.floor((Date.now() - ts) / 60000)
  return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h'
}

function exportCsv() {
  const rows = filtered.value
  const header = ['id', 'src', 'dst', 'dstIp', 'proto', 'port', 'bytes', 'packets', 'threat', 'durationMs', 'startedAt']
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    header.join(','),
    ...rows.map((f) => header.map((k) => esc(f[k])).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flowscope-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="shell">
    <header>
      <div class="brand">
        <div class="mark" />
        <div>
          <h1>Flowscope</h1>
          <p>Network flow analyzer · talkers · threat tags</p>
        </div>
      </div>
      <div class="head-actions">
        <button type="button" class="export" @click="exportCsv">Export CSV</button>
        <span class="pill">Demo telemetry</span>
      </div>
    </header>

    <section class="kpis">
      <div><b>{{ summary.flows }}</b><span>Flows</span></div>
      <div><b>{{ fmtBytes(summary.bytes) }}</b><span>Volume</span></div>
      <div class="warn"><b>{{ summary.suspicious }}</b><span>Suspicious</span></div>
      <div class="bad"><b>{{ summary.blocked }}</b><span>Blocked</span></div>
    </section>

    <div class="layout">
      <section class="panel">
        <div class="toolbar">
          <h2>Flows</h2>
          <select v-model="threat">
            <option value="all">All threat</option>
            <option value="ok">ok</option>
            <option value="suspicious">suspicious</option>
            <option value="blocked">blocked</option>
          </select>
          <select v-model="proto">
            <option value="all">All proto</option>
            <option>TCP</option>
            <option>UDP</option>
            <option>HTTPS</option>
            <option>DNS</option>
            <option>SSH</option>
          </select>
        </div>
        <div class="table">
          <button
            v-for="f in filtered"
            :key="f.id"
            type="button"
            class="row"
            :class="{ on: selected?.id === f.id }"
            @click="selected = f"
          >
            <em :data-t="f.threat">{{ f.threat }}</em>
            <code>{{ f.src }}</code>
            <span>→</span>
            <strong>{{ f.dst }}</strong>
            <code>{{ f.proto }}:{{ f.port }}</code>
            <b>{{ fmtBytes(f.bytes) }}</b>
            <small>{{ ago(f.startedAt) }}</small>
          </button>
        </div>
      </section>

      <aside class="panel side">
        <h2>Top talkers</h2>
        <div v-for="([name, bytes], i) in summary.top" :key="name" class="talker">
          <span>{{ i + 1 }}. {{ name }}</span>
          <b>{{ fmtBytes(bytes) }}</b>
          <i :style="{ width: Math.max(8, (bytes / (summary.top[0]?.[1] || 1)) * 100) + '%' }" />
        </div>

        <template v-if="selected">
          <h2 class="mt">Selected flow</h2>
          <dl>
            <div><dt>id</dt><dd>{{ selected.id }}</dd></div>
            <div><dt>src</dt><dd>{{ selected.src }}</dd></div>
            <div><dt>dst</dt><dd>{{ selected.dst }} ({{ selected.dstIp }})</dd></div>
            <div><dt>proto</dt><dd>{{ selected.proto }} / {{ selected.port }}</dd></div>
            <div><dt>packets</dt><dd>{{ selected.packets }}</dd></div>
            <div><dt>duration</dt><dd>{{ selected.durationMs }} ms</dd></div>
          </dl>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; padding: 18px clamp(14px, 3vw, 28px) 28px; display: grid; gap: 14px; }
header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; animation: rise .4s ease; }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.brand { display: flex; gap: 12px; align-items: center; }
.mark {
  width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--line);
  background: linear-gradient(145deg, rgba(94,200,255,.2), #0a1520);
  position: relative;
}
.mark::after {
  content: ''; position: absolute; inset: 14px 8px; border-radius: 3px;
  background: repeating-linear-gradient(90deg, var(--cyan) 0 3px, transparent 3px 7px);
  opacity: .7; animation: sweep 2.2s ease-in-out infinite;
}
@keyframes sweep { 50% { opacity: 1; transform: scaleY(1.15); } }
h1 { margin: 0; font-size: 1.3rem; letter-spacing: -.02em; }
.brand p { margin: 4px 0 0; color: var(--muted); font-size: .85rem; }
.head-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.export {
  padding: 7px 12px; border-radius: 999px; border: 1px solid var(--line);
  font-weight: 600; font-size: .8rem; color: var(--text);
  background: rgba(78,196,255,.08);
}
.pill {
  font-family: var(--mono); font-size: .72rem; color: var(--mint);
  border: 1px solid rgba(61,255,168,.3); padding: 7px 10px; border-radius: 999px;
}
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.kpis > div {
  padding: 14px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line); display: grid; gap: 4px;
}
.kpis b { font-family: var(--mono); font-size: 1.2rem; }
.kpis span { color: var(--faint); font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; }
.kpis .warn b { color: var(--amber); }
.kpis .bad b { color: var(--red); }
.layout { display: grid; grid-template-columns: 1.45fr .85fr; gap: 12px; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 14px; }
.toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
.toolbar h2, .panel > h2 { margin: 0; font-size: .95rem; flex: 1; }
select { padding: 7px 10px; border-radius: 8px; border: 1px solid var(--line); background: #070d14; }
.table { display: grid; gap: 4px; max-height: 560px; overflow: auto; }
.row {
  display: grid; grid-template-columns: 88px 1.1fr auto 1fr .9fr .7fr 40px;
  gap: 8px; align-items: center; text-align: left; padding: 9px 10px; border-radius: 10px;
  border: 1px solid transparent; font-size: .8rem;
}
.row:hover, .row.on { background: #101925; border-color: var(--line); }
.row code, .row b, .row small { font-family: var(--mono); font-size: .72rem; }
.row small { color: var(--faint); }
.row strong { font-size: .82rem; }
em {
  font-style: normal; font-family: var(--mono); font-size: .62rem; text-transform: uppercase;
  padding: 3px 6px; border-radius: 6px; text-align: center; background: #121a22;
}
em[data-t='ok'] { color: var(--mint); }
em[data-t='suspicious'] { color: var(--amber); background: rgba(255,180,84,.1); }
em[data-t='blocked'] { color: var(--red); background: rgba(255,92,108,.1); }
.talker { position: relative; margin: 10px 0; padding: 8px 0; display: flex; justify-content: space-between; font-size: .85rem; }
.talker b { font-family: var(--mono); font-size: .75rem; color: var(--cyan); }
.talker i {
  position: absolute; left: 0; bottom: 0; height: 3px; border-radius: 99px;
  background: linear-gradient(90deg, var(--cyan), var(--mint));
}
.mt { margin-top: 22px; }
dl { display: grid; gap: 8px; margin: 12px 0 0; }
dl > div { display: grid; grid-template-columns: 80px 1fr; gap: 8px; font-size: .82rem; }
dt { color: var(--faint); }
dd { margin: 0; font-family: var(--mono); font-size: .75rem; color: var(--muted); }
@media (max-width: 960px) {
  .layout { grid-template-columns: 1fr; }
  .kpis { grid-template-columns: 1fr 1fr; }
  .row { grid-template-columns: 80px 1fr; }
  .row span, .row code:nth-of-type(2), .row b, .row small { display: none; }
}
</style>
