import {
  Box,
  Button,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useImperativeHandle, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseDialog, DialogRef, Switch } from '@/components/base'
import {
  DEFAULT_PORT_COLOR,
  resolveNodePortStyle,
  useNodePortStyleSetting,
} from '@/hooks/use-node-port-style'
import { openNodePortsWindow } from '@/services/cmds'
import { showNotice } from '@/services/notice-service'

const FONT_PRESETS = [
  { value: '', label: 'Default' },
  { value: 'Consolas, "Courier New", monospace', label: 'Consolas' },
  { value: '"Microsoft YaHei", sans-serif', label: 'Microsoft YaHei' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Segoe UI", sans-serif', label: 'Segoe UI' },
  { value: 'Impact, sans-serif', label: 'Impact' },
]

export function NodePortStyleViewer(props: { ref?: React.Ref<DialogRef> }) {
  const { ref } = props
  const { t } = useTranslation()
  const { stored, save } = useNodePortStyleSetting()
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<INodePortStyle>({})

  useImperativeHandle(ref, () => ({
    open: () => {
      setStyle({ ...(stored ?? {}) })
      setOpen(true)
    },
    close: () => setOpen(false),
  }))

  const resolved = resolveNodePortStyle(style)
  const fontValue = FONT_PRESETS.some((f) => f.value === (style.font_family ?? ''))
    ? (style.font_family ?? '')
    : '__custom__'

  const onSave = async () => {
    try {
      await save(style)
      showNotice.success('settings.modals.portStyle.saved')
      setOpen(false)
    } catch (err) {
      showNotice.error('settings.modals.portStyle.saveFailed', err)
    }
  }

  return (
    <BaseDialog
      open={open}
      title={t('settings.modals.portStyle.title')}
      contentSx={{ width: 420 }}
      okBtn={t('shared.actions.save')}
      cancelBtn={t('shared.actions.cancel')}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <Stack spacing={2} sx={{ width: '100%' }}>
        {/* live preview */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 72,
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
        >
          <Box
            sx={{
              color: resolved.color,
              fontSize: resolved.fontSize,
              fontFamily: resolved.fontFamily,
              fontWeight: resolved.fontWeight,
            }}
          >
            7777
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ flex: 1, fontSize: 13 }}>
            {t('settings.modals.portStyle.color')}
          </Typography>
          <input
            type="color"
            value={resolved.color}
            onChange={(e) => setStyle({ ...style, color: e.target.value })}
            style={{ width: 40, height: 28, border: 0, background: 'none' }}
          />
          <TextField
            size="small"
            value={style.color ?? ''}
            placeholder={DEFAULT_PORT_COLOR}
            onChange={(e) => setStyle({ ...style, color: e.target.value })}
            sx={{ width: 110 }}
            slotProps={{ htmlInput: { style: { fontSize: 12 } } }}
          />
        </Box>

        <Box>
          <Typography sx={{ fontSize: 13 }}>
            {t('settings.modals.portStyle.fontSize')}: {resolved.fontSize}px
          </Typography>
          <Slider
            size="small"
            min={12}
            max={48}
            step={1}
            value={resolved.fontSize}
            onChange={(_, v) =>
              setStyle({ ...style, font_size: Array.isArray(v) ? v[0] : v })
            }
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ flex: 1, fontSize: 13 }}>
            {t('settings.modals.portStyle.fontFamily')}
          </Typography>
          <Select
            size="small"
            value={fontValue}
            onChange={(e) =>
              setStyle({
                ...style,
                font_family: e.target.value === '__custom__' ? style.font_family : e.target.value,
              })
            }
            sx={{ width: 170, fontSize: 12 }}
          >
            {FONT_PRESETS.map((f) => (
              <MenuItem key={f.label} value={f.value} sx={{ fontSize: 12 }}>
                {f.label}
              </MenuItem>
            ))}
            <MenuItem value="__custom__" sx={{ fontSize: 12 }}>
              {t('settings.modals.portStyle.custom')}
            </MenuItem>
          </Select>
        </Box>
        {fontValue === '__custom__' && (
          <TextField
            size="small"
            value={style.font_family ?? ''}
            placeholder={t('settings.modals.portStyle.customHint')}
            onChange={(e) => setStyle({ ...style, font_family: e.target.value })}
            slotProps={{ htmlInput: { style: { fontSize: 12 } } }}
          />
        )}

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ flex: 1, fontSize: 13 }}>
            {t('settings.modals.portStyle.bold')}
          </Typography>
          <Switch
            checked={style.bold ?? true}
            onChange={(_, c) => setStyle({ ...style, bold: c })}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" onClick={() => setStyle({})}>
            {t('settings.modals.portStyle.reset')}
          </Button>
          <Button size="small" onClick={() => void openNodePortsWindow()}>
            {t('settings.modals.portStyle.openWindow')}
          </Button>
        </Box>
      </Stack>
    </BaseDialog>
  )
}
