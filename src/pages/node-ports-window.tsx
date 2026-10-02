import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { resolveNodePortStyle } from '@/hooks/use-node-port-style'
import { hideInitialOverlay } from '@/pages/_layout/utils'
import {
  getRuntimeConfig,
  getVergeConfig,
  patchVergeConfig,
} from '@/services/cmds'

type Ports = Record<string, number>

/**
 * Standalone window (label "node-ports"): shows which node listens on which local SOCKS5 port
 * and lets you add, change or remove those ports. Plain HTML/CSS on purpose, so it does not
 * depend on the main app's providers or router.
 */
export const NodePortsWindow = ({ themeMode }: { themeMode: 'light' | 'dark' }) => {
  const { t } = useTranslation()
  const [config, setConfig] = useState<IVergeConfig | null>(null)
  const [nodeNames, setNodeNames] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [newName, setNewName] = useState('')
  const [newPort, setNewPort] = useState('')

  // index.html covers the screen with a loading overlay that only the main layout removes.
  useEffect(() => {
    const timer = hideInitialOverlay()
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  const loadConfig = useCallback(async () => {
    try {
      setConfig(await getVergeConfig())
    } catch {
      // keep the last good snapshot
    }
  }, [])

  useEffect(() => {
    void loadConfig()
    const timer = window.setInterval(() => void loadConfig(), 1500)
    return () => window.clearInterval(timer)
  }, [loadConfig])

  // Node names for the "add" box come from the runtime config (nodes written in the subscription).
  useEffect(() => {
    const loadNodes = async () => {
      try {
        const runtime = (await getRuntimeConfig()) as unknown as {
          proxies?: { name?: unknown }[]
        } | null
        const names = (runtime?.proxies ?? [])
          .map((p) => p?.name)
          .filter((n): n is string => typeof n === 'string' && n !== '')
        setNodeNames(names)
      } catch {
        // the add box still accepts a typed name
      }
    }
    void loadNodes()
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 3500)
    return () => window.clearTimeout(timer)
  }, [message])

  const ports: Ports = useMemo(
    () => config?.verge_node_socks_ports ?? {},
    [config],
  )
  const rows = useMemo(
    () => Object.entries(ports).sort((a, b) => a[1] - b[1]),
    [ports],
  )
  const portStyle = resolveNodePortStyle(config?.node_port_style)
  const freeNames = useMemo(
    () => nodeNames.filter((n) => !(n in ports)),
    [nodeNames, ports],
  )

  const validate = (name: string, port: number): string | null => {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      return t('proxies.page.socksPort.invalid')
    }
    const reserved = [
      config?.verge_mixed_port,
      config?.verge_socks_port,
      config?.verge_port,
      config?.verge_redir_port,
      config?.verge_tproxy_port,
    ]
    if (reserved.includes(port)) return t('proxies.page.socksPort.reserved')
    const usedByOther = Object.entries(ports).some(
      ([node, p]) => node !== name && p === port,
    )
    if (usedByOther) return t('proxies.page.socksPort.usedByOther')
    return null
  }

  const save = async (next: Ports): Promise<boolean> => {
    setBusy(true)
    try {
      await patchVergeConfig({ verge_node_socks_ports: next })
      await loadConfig()
      setMessage({ text: t('proxies.page.socksPort.window.saved'), ok: true })
      return true
    } catch (err) {
      setMessage({
        text: `${t('proxies.page.socksPort.window.saveFailed')}: ${String(err)}`,
        ok: false,
      })
      return false
    } finally {
      setBusy(false)
    }
  }

  const commitRow = async (name: string) => {
    const draft = drafts[name]
    setDrafts((d) => {
      const { [name]: _removed, ...rest } = d
      return rest
    })
    if (draft === undefined || draft === String(ports[name])) return
    if (draft === '') {
      const { [name]: _gone, ...rest } = ports
      await save(rest)
      return
    }
    const error = validate(name, Number(draft))
    if (error) {
      setMessage({ text: error, ok: false })
      return
    }
    await save({ ...ports, [name]: Number(draft) })
  }

  const removeRow = async (name: string) => {
    const { [name]: _gone, ...rest } = ports
    await save(rest)
  }

  const addRow = async () => {
    const name = newName.trim()
    if (!name) {
      setMessage({ text: t('proxies.page.socksPort.window.nameRequired'), ok: false })
      return
    }
    const error = validate(name, Number(newPort))
    if (error) {
      setMessage({ text: error, ok: false })
      return
    }
    if (await save({ ...ports, [name]: Number(newPort) })) {
      setNewName('')
      setNewPort('')
    }
  }

  const copy = async (port: number) => {
    try {
      await navigator.clipboard.writeText(`127.0.0.1:${port}`)
      setCopied(port)
      window.setTimeout(() => setCopied((c) => (c === port ? null : c)), 1200)
    } catch {
      // clipboard unavailable: ignore
    }
  }

  const dark = themeMode === 'dark'
  const colors = dark
    ? { bg: '#1a1b24', card: '#24252f', text: '#e8e9ee', sub: '#9aa0ad', line: '#33343f', field: '#1a1b24' }
    : { bg: '#f5f6fa', card: '#ffffff', text: '#22242c', sub: '#6b7180', line: '#e3e5ec', field: '#f5f6fa' }

  const fieldStyle = {
    boxSizing: 'border-box' as const,
    padding: '6px 8px',
    fontSize: 13,
    borderRadius: 6,
    color: colors.text,
    background: colors.field,
    border: `1px solid ${colors.line}`,
    outline: 'none',
  }
  const buttonStyle = {
    flex: 'none' as const,
    cursor: busy ? 'default' : 'pointer',
    padding: '5px 10px',
    fontSize: 12,
    borderRadius: 6,
    color: colors.text,
    background: 'transparent',
    border: `1px solid ${colors.line}`,
  }
  const digits = (value: string) => value.replace(/\D+/g, '').slice(0, 5)

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

      {/* add a node port */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: 10,
          marginBottom: 8,
          borderRadius: 8,
          background: colors.card,
          border: `1px dashed ${colors.line}`,
        }}
      >
        <input
          list="node-ports-names"
          value={newName}
          placeholder={t('proxies.page.socksPort.window.nodePlaceholder')}
          onChange={(e) => setNewName(e.target.value)}
          style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
        />
        <datalist id="node-ports-names">
          {freeNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <input
          value={newPort}
          inputMode="numeric"
          placeholder={t('proxies.page.socksPort.placeholder')}
          onChange={(e) => setNewPort(digits(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addRow()
          }}
          style={{ ...fieldStyle, width: 72, textAlign: 'center' }}
        />
        <button type="button" disabled={busy} onClick={() => void addRow()} style={buttonStyle}>
          {t('proxies.page.socksPort.window.add')}
        </button>
      </div>

      <div
        style={{
          minHeight: 18,
          marginBottom: 8,
          fontSize: 12,
          color: message ? (message.ok ? '#3ddc84' : '#ff6b6b') : colors.sub,
        }}
      >
        {message ? message.text : t('proxies.page.socksPort.window.hintEdit')}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: colors.sub, fontSize: 13 }}>
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
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                background: colors.card,
                border: `1px solid ${colors.line}`,
              }}
            >
              <input
                value={drafts[name] ?? String(port)}
                inputMode="numeric"
                disabled={busy}
                title={t('proxies.page.socksPort.tooltip')}
                onChange={(e) => setDrafts((d) => ({ ...d, [name]: digits(e.target.value) }))}
                onBlur={() => void commitRow(name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') {
                    setDrafts((d) => {
                      const { [name]: _x, ...rest } = d
                      return rest
                    })
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                style={{
                  width: Math.max(84, Math.round(portStyle.fontSize * 3.6)),
                  flex: 'none',
                  boxSizing: 'border-box',
                  padding: '2px 4px',
                  textAlign: 'center',
                  color: portStyle.color,
                  fontSize: portStyle.fontSize,
                  fontWeight: portStyle.fontWeight,
                  fontFamily: portStyle.fontFamily,
                  lineHeight: 1.2,
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 6,
                  outline: 'none',
                }}
                onFocus={(e) => (e.target.style.borderColor = colors.line)}
                onBlurCapture={(e) => (e.target.style.borderColor = 'transparent')}
              />
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
              <button type="button" onClick={() => void copy(port)} style={buttonStyle}>
                {copied === port
                  ? t('proxies.page.socksPort.window.copied')
                  : t('proxies.page.socksPort.window.copy')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeRow(name)}
                style={{ ...buttonStyle, color: '#ff6b6b' }}
              >
                {t('proxies.page.socksPort.window.delete')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
