// Dedicated AitherNet tab (`#/network`): live mesh pulse, active models, and node onboarding.
// AGPL-3.0-only.
import type { AitherNetPulse } from '../api/public'
import { ago } from '../api/helpers'

export function NetworkView({
  pulse,
  loading,
  onRefresh,
}: {
  pulse: AitherNetPulse | null
  loading: boolean
  onRefresh: () => void
}) {
  const status = pulse?.status || 'unavailable'
  const statusClass = status === 'online' || status === 'healthy' ? 'ok' : status === 'degraded' ? 'warn' : ''

  return (
    <section className="stack" aria-label="AitherNet live pulse">
      <div className="card stack-sm">
        <div className="row between wrap">
          <div className="row wrap">
            <h1>AitherNet Mesh</h1>
            <span className={`pill ${statusClass}`}>{loading ? 'checking…' : status}</span>
          </div>
          <button className="ghost btn-sm" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh pulse'}
          </button>
        </div>
        <p className="dim">
          Distributed inference and peer compute mesh across Aitherium nodes. All counts below come directly
          from live telemetry—never placeholder numbers.
        </p>

        <dl className="stats">
          <div>
            <dt>mesh status</dt>
            <dd>{status}</dd>
          </div>
          <div>
            <dt>online nodes</dt>
            <dd>{pulse?.onlineNodes ?? '—'}</dd>
          </div>
          <div>
            <dt>providers</dt>
            <dd>{pulse?.totalProviders ?? '—'}</dd>
          </div>
          <div>
            <dt>models served</dt>
            <dd>{pulse ? pulse.servedModels.length : '—'}</dd>
          </div>
        </dl>

        {pulse?.gpuNodes !== undefined && pulse.gpuNodes !== null && (
          <p className="mono dim small">
            GPU nodes: {pulse.gpuNodes}
            {pulse.totalNodes !== undefined && pulse.totalNodes !== null ? ` · Total registered: ${pulse.totalNodes}` : ''}
            {pulse.relaysPublic !== undefined && pulse.relaysPublic !== null ? ` · Public relays: ${pulse.relaysPublic}` : ''}
            {pulse.roomsPublic !== undefined && pulse.roomsPublic !== null ? ` · Public rooms: ${pulse.roomsPublic}` : ''}
          </p>
        )}
        {pulse?.latencyMs !== undefined && pulse.latencyMs !== null && (
          <p className="mono dim small">Median mesh latency: {pulse.latencyMs} ms</p>
        )}
        {pulse?.updatedAt && (
          <p className="mono dim small">Last telemetry update: {ago(pulse.updatedAt) || pulse.updatedAt}</p>
        )}
        {pulse?.note && (
          <div className="notice-banner small">
            <strong>Status note:</strong> {pulse.note}
          </div>
        )}
      </div>

      <section className="card stack-sm" aria-label="Served models">
        <h2>Active Models &amp; Providers</h2>
        {!pulse || pulse.servedModels.length === 0 ? (
          <p className="dim small">
            {loading
              ? 'Loading active models…'
              : 'No public models reported online right now. Connect a local node below to contribute capacity.'}
          </p>
        ) : (
          <ul className="chips">
            {pulse.servedModels.map(m => (
              <li key={m} className="mono">{m}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack-sm" aria-label="Join AitherNet as a node">
        <h2>Join AitherNet as a Node</h2>
        <p className="dim">
          Contribute idle GPU or CPU capacity with <code>awnode</code> or manage agents and models via the
          Aither Developer Kit (<code>adk</code>). Hardware-signed device keys keep node reputation verifiable.
        </p>
        <pre className="md-code"><code>{pulse?.joinCli
          ? `# Join AitherNet\n${pulse.joinCli}`
          : `# Install & enroll a node with awnode / adk\npip install awnode awdk\nadk login && awnode join`}</code></pre>
        <div className="row wrap">
          {pulse?.joinDocsUrl && (
            <a className="link" href={pulse.joinDocsUrl} target="_blank" rel="noopener noreferrer">
              AitherNet docs ↗
            </a>
          )}
          <a className="link" href="https://aitherium.github.io/awnode/" target="_blank" rel="noopener noreferrer">
            awnode docs ↗
          </a>
          <a className="link" href="https://aitherium.github.io/awdk/" target="_blank" rel="noopener noreferrer">
            awdk CLI ↗
          </a>
          <a className="link" href="https://aitherium.org/" target="_blank" rel="noopener noreferrer">
            Aitherium Protocol ↗
          </a>
        </div>
      </section>
    </section>
  )
}
