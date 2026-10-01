import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { resolveNodePortStyle } from '@/hooks/use-node-port-style'
import { hideInitialOverlay } from '@/pages/_layout/utils'
import { getVergeConfig } from '@/services/cmds'

/**
 * Standalone window (label "node-ports"): lists which node listens on which local SOCKS5 port.
 * Deliberately plain HTML/CSS so it does not depend on the main app's providers or router.
 */
export const NodePortsWindow = ({ themeMode }: { themeMode: 'light' | 'dark' }) => {
  const { t } = useTranslation()
  const [config, setConfig] = useState<IVergeConfig | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  // index.html covers the screen with a loading overlay that only the main layout removes.
  useEffect(() => {
    const timer = hideInitialOverlay()
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const next = await getVergeConfig()
        if (alive) setConfig(next)
      } catch {
        // keep the last good snapshot
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), 1500)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  const rows = useMemo(
    () =>
      Object.entries(config?.verge_node_socks_ports ?? {}).sort(
        (a, b) => a[1] - b[1],
      ),
    [config],
  )
  const portStyle = resolveNodePortStyle(config?.node_port_style)

  const dark = themeMode === 'dark'
  const colors = dark
    ? { bg: '#1a1b24', card: '#24252f', text: '#e8e9ee', sub: '#9aa0ad', line: '#33343f' }
    : { bg: '#f5f6fa', card: '#ffffff', text: '#22242c', sub: '#6b7180', line: '#e3e5ec' }

  const copy = async (port: number) => {
    try {
      await navigator.clipboard.writeText(`127.0.0.1:${port}`)
      setCopied(port)
      window.setTimeout(() => setCopied((c) => (c === port ? null : c)), 1200)
    } catch {
      // clipboard unavailable: ignore
    }
  }

  return (
    <div
      style={{
        boxSizing: 'border-box',
        height: '100vh',
        overflow: 'auto',
        padding: 16,
        background: colors.bg,
        color: colors.text,
        fontFamily: '"Segoe UI", "Microsoft YaHei", system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{t('proxies.page.socksPort.window.title')}</div>
        <div style={{ fontSize: 12, color: colors.sub }}>
          {t('proxies.page.socksPort.window.total', { n: rows.length })}
        </div>
      </div>
      <div style={{ fontSize: 12, color: colors.sub, marginBottom: 12 }}>
        {t('proxies.page.socksPort.window.address')}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: colors.sub, fontSize: 13 }}>
          {t('proxies.page.socksPort.window.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(([name, port]) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                background: colors.card,
                border: `1px solid ${colors.line}`,
              }}
            >
              <div
                style={{
                  minWidth: 84,
                  textAlign: 'center',
                  color: portStyle.color,
                  fontSize: portStyle.fontSize,
                  fontWeight: portStyle.fontWeight,
                  fontFamily: portStyle.fontFamily,
                  lineHeight: 1.2,
                }}
              >
                {port}
              </div>
              <div
                title={name}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 14,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {name}
              </div>
              <button
                type="button"
                onClick={() => void copy(port)}
                style={{
                  flex: 'none',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  color: colors.text,
                  background: 'transparent',
                  border: `1px solid ${colors.line}`,
                }}
              >
                {copied === port
                  ? t('proxies.page.socksPort.window.copied')
                  : t('proxies.page.socksPort.window.copy')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
