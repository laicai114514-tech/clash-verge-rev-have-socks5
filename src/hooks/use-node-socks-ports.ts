import { useCallback } from 'react'

import { useVerge } from '@/hooks/use-verge'
import { patchVergeConfig } from '@/services/cmds'

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

  return { ports, setPort, verge }
}
