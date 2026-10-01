import { useCallback } from 'react'

import { useVerge } from '@/hooks/use-verge'

export const DEFAULT_PORT_COLOR = '#ffa726'
export const DEFAULT_PORT_FONT_SIZE = 22

/** Turns the stored (partial) port style into concrete CSS values. */
export const resolveNodePortStyle = (style?: INodePortStyle) => ({
  color: style?.color || DEFAULT_PORT_COLOR,
  fontSize: style?.font_size ?? DEFAULT_PORT_FONT_SIZE,
  fontFamily: style?.font_family || 'inherit',
  fontWeight: (style?.bold ?? true) ? 800 : 400,
})

export const useNodePortStyle = () => {
  const { verge } = useVerge()
  return resolveNodePortStyle(verge?.node_port_style)
}

/** Raw stored style + a saver, for the settings dialog. */
export const useNodePortStyleSetting = () => {
  const { verge, patchVerge } = useVerge()
  const save = useCallback(
    (style: INodePortStyle) => patchVerge({ node_port_style: style }),
    [patchVerge],
  )
  return { stored: verge?.node_port_style, save }
}
