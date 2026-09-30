import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useNodeSocksPorts } from '@/hooks/use-node-socks-ports'
import { showNotice } from '@/services/notice-service'

interface Props {
  name: string
  onClose: () => void
}

export const NodeSocksPortDialog = ({ name, onClose }: Props) => {
  const { t } = useTranslation()
  const { ports, setPort, verge } = useNodeSocksPorts()
  const current = ports[name]
  const [value, setValue] = useState(current ? String(current) : '')
  const [saving, setSaving] = useState(false)

  const reserved = new Set<number>(
    [
      verge?.verge_mixed_port,
      verge?.verge_socks_port,
      verge?.verge_port,
      verge?.verge_redir_port,
      verge?.verge_tproxy_port,
    ].filter((p): p is number => typeof p === 'number'),
  )
  const usedByOthers = new Set<number>(
    Object.entries(ports)
      .filter(([node]) => node !== name)
      .map(([, port]) => port),
  )

  const port = Number(value)
  let error = ''
  if (value !== '') {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      error = t('proxies.page.socksPort.invalid')
    } else if (reserved.has(port)) {
      error = t('proxies.page.socksPort.reserved')
    } else if (usedByOthers.has(port)) {
      error = t('proxies.page.socksPort.usedByOther')
    }
  }

  const save = async (next: number | null) => {
    setSaving(true)
    try {
      await setPort(name, next)
      showNotice.success('proxies.page.socksPort.saved')
      onClose()
    } catch (err) {
      showNotice.error('proxies.page.socksPort.saveFailed', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('proxies.page.socksPort.title')}</DialogTitle>
      <DialogContent>
        <Typography
          variant="body2"
          sx={{ mb: 2, wordBreak: 'break-all' }}
          color="text.secondary"
        >
          {name}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={t('proxies.page.socksPort.label')}
          value={value}
          error={!!error}
          helperText={error || t('proxies.page.socksPort.hint')}
          onChange={(e) => setValue(e.target.value.replace(/\D+/g, '').slice(0, 5))}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
      </DialogContent>
      <DialogActions>
        {current !== undefined && (
          <Button color="error" disabled={saving} onClick={() => void save(null)}>
            {t('proxies.page.socksPort.remove')}
          </Button>
        )}
        <Button onClick={onClose}>{t('shared.actions.cancel')}</Button>
        <Button
          variant="contained"
          disabled={saving || !!error || value === ''}
          onClick={() => void save(port)}
        >
          {t('shared.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
