import { alpha, InputBase } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNodePortStyle } from '@/hooks/use-node-port-style'
import { useNodeSocksPorts } from '@/hooks/use-node-socks-ports'
import { openNodePortsWindow } from '@/services/cmds'
import { showNotice } from '@/services/notice-service'

// The ports window pops up once per app session, after the first saved port.
let portsWindowShown = false

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

/** Inline input on a node card: type a local SOCKS5 port, Enter/blur to save. */
export const NodePortInput = ({ name }: { name: string }) => {
  const { t } = useTranslation()
  const { ports, setPort, validatePort } = useNodeSocksPorts()
  const style = useNodePortStyle()
  const current = ports[name]
  const currentText = current === undefined ? '' : String(current)
  const [text, setText] = useState(currentText)
  const cancelled = useRef(false)

  useEffect(() => {
    setText(currentText)
  }, [currentText])

  const commit = async () => {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    if (text === currentText) return
    if (text === '') {
      try {
        await setPort(name, null)
        showNotice.success('proxies.page.socksPort.removed')
      } catch (err) {
        showNotice.error('proxies.page.socksPort.saveFailed', err)
        setText(currentText)
      }
      return
    }
    const errorKey = validatePort(name, Number(text))
    if (errorKey) {
      showNotice.error(errorKey)
      setText(currentText)
      return
    }
    try {
      await setPort(name, Number(text))
      showNotice.success('proxies.page.socksPort.saved')
      if (!portsWindowShown) {
        portsWindowShown = true
        void openNodePortsWindow()
      }
    } catch (err) {
      showNotice.error('proxies.page.socksPort.saveFailed', err)
      setText(currentText)
    }
  }

  const filled = text !== ''
  const width = filled ? Math.max(64, Math.round(style.fontSize * 3.4)) : 56

  return (
    <InputBase
      value={text}
      placeholder={t('proxies.page.socksPort.placeholder')}
      title={t('proxies.page.socksPort.tooltip')}
      onChange={(e) => setText(e.target.value.replace(/\D+/g, '').slice(0, 5))}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        e.stopPropagation()
        const input = e.target as HTMLInputElement
        if (e.key === 'Enter') {
          input.blur()
        } else if (e.key === 'Escape') {
          cancelled.current = true
          setText(currentText)
          input.blur()
        }
      }}
      onClick={stop}
      onMouseDown={stop}
      onContextMenu={stop}
      slotProps={{ input: { inputMode: 'numeric' } }}
      sx={({ palette }) => ({
        flex: 'none',
        width,
        mx: 1,
        borderRadius: 1,
        border: '1px solid',
        borderColor: filled ? 'transparent' : alpha(palette.text.secondary, 0.35),
        borderStyle: filled ? 'solid' : 'dashed',
        '&:hover, &.Mui-focused': {
          borderColor: alpha(filled ? style.color : palette.primary.main, 0.7),
          borderStyle: 'solid',
        },
        '& input': {
          p: '1px 2px',
          textAlign: 'center',
          fontSize: filled ? style.fontSize : 12,
          fontWeight: filled ? style.fontWeight : 400,
          fontFamily: filled ? style.fontFamily : 'inherit',
          color: filled ? style.color : 'text.secondary',
          lineHeight: 1.25,
        },
      })}
    />
  )
}
