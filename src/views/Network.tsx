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
  const online = status === 'online' || status === 'healthy'

  const metaParts: string[] = []
  if (pulse?.gpuNodes !== undefined && pulse.gpuNodes !== null) metaParts.push(`${pulse.gpuNodes} GPU nodes`)
  if (pulse?.totalNodes !== undefined && pulse.totalNodes !== null) metaParts.push(`${pulse.totalNodes} registered`)
  if (pulse?.relaysPublic !== undefined && pulse.relaysPublic !== null) metaParts.push(`${pulse.relaysPublic} public relays`)
  if (pulse?.roomsPublic !== undefined && pulse.roomsPublic !== null) metaParts.push(`${pulse.roomsPublic} public rooms`)
  if (pulse?.latencyMs !== undefined && pulse.latencyMs !== null) metaParts.push(`${pulse.latencyMs} ms median latency`)
  if (pulse?.updatedAt) metaParts.push(`updated ${ago(pulse.updatedAt) || pulse.updatedAt}`)

  return (
    <section className="stack" aria-label="AitherNet live pulse">
      <header className="stream-header">
        <div className="row">
          <h1>AitherNet Mesh</h1>
          <span className={online ? 'status-dot on' : 'status-dot'} aria-hidden="true" />
          <span className="xs muted">{loading ? 'checking…' : status}</span>
        </div>
        <button className="linkish xs" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <dl className="stat-strip">
        <div>
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
        <div>
          <dt>Online nodes</dt>
          <dd>{pulse?.onlineNodes ?? '—'}</dd>
        </div>
        <div>
          <dt>Providers</dt>
          <dd>{pulse?.totalProviders ?? '—'}</dd>
        </div>
        <div>
          <dt>Models</dt>
          <dd>{pulse ? pulse.servedModels.length : '—'}</dd>
        </div>
      </dl>

      {(metaParts.length > 0 || pulse?.note) && (
        <div className="pane-section stack-xs">
          {metaParts.length > 0 && (
            <p className="mono xs muted tnum">{metaParts.join(' · ')}</p>
          )}
          {pulse?.note && (
            <p className="small dim">{pulse.note}</p>
          )}
        </div>
      )}

      <section className="pane-section stack-sm" aria-label="Served models">
        <h2>Active Models</h2>
        {!pulse || pulse.servedModels.length === 0 ? (
          <p className="dim small">
            {loading
              ? 'Loading active models…'
              : 'No public models reported online right now. Connect a local node below to contribute capacity.'}
          </p>
        ) : (
          <p className="mono small dim">{pulse.servedModels.join(' · ')}</p>
        )}
      </section>

      <section className="pane-section stack-sm" aria-label="Join AitherNet as a node">
        <h2>Join as a Node</h2>
        <p className="dim small">
          Contribute idle GPU or CPU capacity with <code>awnode</code> or manage agents and models via the
          Aither Developer Kit (<code>adk</code>). Hardware-signed device keys keep node reputation verifiable.
        </p>
        <pre className="md-code"><code>{pulse?.joinCli
          ? `# Join AitherNet\n${pulse.joinCli}`
          : `# Install & enroll a node with awnode / adk\npip install awnode awdk\nadk login && awnode join`}</code></pre>
        <div className="post-foot" style={{ marginTop: 4 }}>
          {pulse?.joinDocsUrl && (
            <a href={pulse.joinDocsUrl} target="_blank" rel="noopener noreferrer">
              AitherNet docs ↗
            </a>
          )}
          <a href="https://aitherium.github.io/awnode/" target="_blank" rel="noopener noreferrer">
            awnode docs ↗
          </a>
          <a href="https://aitherium.github.io/awdk/" target="_blank" rel="noopener noreferrer">
            awdk CLI ↗
          </a>
          <a href="https://aitherium.org/" target="_blank" rel="noopener noreferrer">
            Aitherium Protocol ↗
          </a>
        </div>
      </section>
    </section>
  )
}
