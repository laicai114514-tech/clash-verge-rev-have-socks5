import { CheckCircleOutlineRounded } from '@mui/icons-material'
import { alpha, Box, ListItemButton, styled, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { BaseLoading } from '@/components/base'
import { useProxyDelayState } from '@/hooks/use-proxy-delay-state'
import delayManager from '@/services/delay'
import {
  memberDetails,
  type ProxyGroupView,
  type ResolvedProxyMember,
} from '@/types/proxy-view'

import { NodePortInput } from './node-port-input'

interface Props {
  group: ProxyGroupView
  member: ResolvedProxyMember
  selected: boolean
  showType?: boolean
  onClick?: (member: ResolvedProxyMember) => void
}

// 多列布局
export const ProxyItemMini = (props: Props) => {
  const { group, member, selected, showType = true, onClick } = props
  const details = memberDetails(member)
  const unresolved = member.kind === 'unresolved'
  const name = member.ref.name
  const type = unresolved ? member.ref.reason : (details?.type ?? '')
  const now = member.kind === 'group' ? member.group.now : undefined

  const { t } = useTranslation()

  // 仅具体节点可设置专属本地 SOCKS5 端口
  const canBindPort = member.kind === 'node'

  // -1/<=0 为不显示，-2 为 loading
  const { delayValue, isPreset, timeout, onDelay } = useProxyDelayState(
    member,
    group.name,
  )

  return (
    <ListItemButton
        dense
        disabled={unresolved}
        selected={!unresolved && selected}
        onClick={unresolved ? undefined : () => onClick?.(member)}
        sx={[
          {
            height: 56,
            borderRadius: 1.5,
            pl: 1.5,
            pr: 1,
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          ({ palette: { mode, primary } }) => {
            const bgcolor = mode === 'light' ? '#ffffff' : '#24252f'
            const showDelay = delayValue > 0
            const selectColor = mode === 'light' ? primary.main : primary.light

            return {
              '&:hover .the-check': { display: !showDelay ? 'block' : 'none' },
              '&:hover .the-delay': { display: showDelay ? 'block' : 'none' },
              '&:hover .the-icon': { display: 'none' },
              '&.Mui-selected': {
                width: `calc(100% + 3px)`,
                marginLeft: `-3px`,
                borderLeft: `3px solid ${selectColor}`,
                bgcolor:
                  mode === 'light'
                    ? alpha(primary.main, 0.15)
                    : alpha(primary.main, 0.35),
              },
              backgroundColor: bgcolor,
            }
          },
        ]}
      >
        <Box
          title={`${name}\n${now ?? ''}`}
          sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}
        >
          <Typography
            variant="body2"
            component="div"
            color="text.primary"
            sx={{
              display: 'block',
              textOverflow: 'ellipsis',
              wordBreak: 'break-all',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </Typography>

          {showType && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'nowrap',
                flex: 'none',
                marginTop: '4px',
              }}
            >
              {now && (
                <Typography
                  variant="body2"
                  component="div"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    textOverflow: 'ellipsis',
                    wordBreak: 'break-all',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    marginRight: '8px',
                  }}
                >
                  {now}
                </Typography>
              )}
              <TypeBox color="text.secondary" component="span">
                {type}
              </TypeBox>
              {!unresolved && details?.udp && (
                <TypeBox color="text.secondary" component="span">
                  UDP
                </TypeBox>
              )}
              {!unresolved && details?.xudp && (
                <TypeBox color="text.secondary" component="span">
                  XUDP
                </TypeBox>
              )}
              {!unresolved && details?.tfo && (
                <TypeBox color="text.secondary" component="span">
                  TFO
                </TypeBox>
              )}
              {!unresolved && details?.mptcp && (
                <TypeBox color="text.secondary" component="span">
                  MPTCP
                </TypeBox>
              )}
              {!unresolved && details?.smux && (
                <TypeBox color="text.secondary" component="span">
                  SMUX
                </TypeBox>
              )}
            </Box>
          )}
        </Box>
        {canBindPort && <NodePortInput name={name} />}
        <Box
          sx={{ ml: 0.5, color: 'primary.main', display: isPreset ? 'none' : '' }}
        >
          {!unresolved && delayValue === -2 && (
            <Widget>
              <BaseLoading />
            </Widget>
          )}
          {!unresolved && delayValue !== -2 && (
            <Widget
              className="the-check"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void onDelay()
              }}
              sx={({ palette }) => ({
                display: 'none', // hover 时显示
                ':hover': { bgcolor: alpha(palette.primary.main, 0.15) },
              })}
            >
              {t('shared.actions.check')}
            </Widget>
          )}

          {!unresolved && delayValue >= 0 && (
            // 显示延迟
            <Widget
              className="the-delay"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                void onDelay()
              }}
              sx={({ palette }) => ({
                color: delayManager.formatDelayColor(delayValue, timeout),
                ':hover': { bgcolor: alpha(palette.primary.main, 0.15) },
              })}
            >
              {delayManager.formatDelay(delayValue, timeout)}
            </Widget>
          )}
          {!unresolved &&
            type !== 'Direct' &&
            delayValue !== -2 &&
            delayValue < 0 &&
            selected && (
              // 展示已选择的 icon
              <CheckCircleOutlineRounded
                className="the-icon"
                sx={{ fontSize: 16, mr: 0.5, display: 'block' }}
              />
            )}
        </Box>
    </ListItemButton>
  )
}

const Widget = styled(Box)(({ theme: { typography } }) => ({
  padding: '2px 4px',
  fontSize: 14,
  fontFamily: typography.fontFamily,
  borderRadius: '4px',
}))

const TypeBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'component',
})<{ component?: React.ElementType }>(({ theme: { typography } }) => ({
  display: 'inline-block',
  border: '1px solid #ccc',
  borderColor: 'text.secondary',
  color: 'text.secondary',
  borderRadius: 4,
  fontSize: 10,
  fontFamily: typography.fontFamily,
  marginRight: '4px',
  marginTop: 'auto',
  padding: '0 4px',
  lineHeight: 1.5,
}))
