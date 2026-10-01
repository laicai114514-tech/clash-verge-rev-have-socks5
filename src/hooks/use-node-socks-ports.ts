import { useCallback } from 'react'

import { useVerge } from '@/hooks/use-verge'
import { patchVergeConfig } from '@/services/cmds'

export type NodePortErrorKey =
  | 'proxies.page.socksPort.invalid'
  | 'proxies.page.socksPort.reserved'
  | 'proxies.page.socksPort.usedByOther'

/** Per-node local SOCKS5 ports (proxy name -> port), edited from the node list. */
export const useNodeSocksPorts = () => {
  const { verge, mutateVerge } = useVerge()
  const ports = verge?.verge_node_socks_ports ?? {}

  const setPort = useCallback(
    async (name: string, port: number | null) => {
      const next = { ...(verge?.verge_node_socks_ports ?? {}) }
      if (port === null) {
        delete next[name]
      } else {
        next[name] = port
      }
      await patchVergeConfig({ verge_node_socks_ports: next })
      mutateVerge()
    },
    [verge?.verge_node_socks_ports, mutateVerge],
  )

  /** Returns an i18n key describing why the port is unusable, or null when it is fine. */
  const validatePort = useCallback(
    (name: string, port: number): NodePortErrorKey | null => {
      if (!Number.isInteger(port) || port < 1024 || port > 65535) {
        return 'proxies.page.socksPort.invalid'
      }
      const reserved = [
        verge?.verge_mixed_port,
        verge?.verge_socks_port,
        verge?.verge_port,
        verge?.verge_redir_port,
        verge?.verge_tproxy_port,
      ]
      if (reserved.includes(port)) return 'proxies.page.socksPort.reserved'
      const usedByOther = Object.entries(verge?.verge_node_socks_ports ?? {})
        .some(([node, p]) => node !== name && p === port)
      if (usedByOther) return 'proxies.page.socksPort.usedByOther'
      return null
    },
    [verge],
  )

  return { ports, setPort, validatePort }
}
