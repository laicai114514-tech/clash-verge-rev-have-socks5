import './assets/styles/index.scss'

import { ResizeObserver } from '@juggle/resize-observer'
import { ComposeContextProvider } from 'foxact/compose-context-provider'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { SWRConfig } from 'swr'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { MihomoWebSocket } from 'tauri-plugin-mihomo-api'

import { BaseErrorBoundary } from './components/base'
import { NodePortsWindow } from './pages/node-ports-window'
import { router } from './pages/_routers'
import { preloadHomePageCards } from './pages/home'
import { AppDataProvider } from './providers/app-data-provider'
import { WindowProvider } from './providers/window'
import { FALLBACK_LANGUAGE, initializeLanguage } from './services/i18n'
import {
  preloadAppData,
  resolveThemeMode,
  getPreloadConfig,
} from './services/preload'
import { swrConfig } from './services/query-client'
import {
  LoadingCacheProvider,
  ThemeModeProvider,
  UpdateStateProvider,
} from './services/states'
import { disableWebViewShortcuts } from './utils/disable-webview-shortcuts'

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver
}

const mainElementId = 'root'
const container = document.getElementById(mainElementId)

if (!container) {
  throw new Error(`No container '${mainElementId}' found to render application`)
}

disableWebViewShortcuts()

const initializeApp = (initialThemeMode: 'light' | 'dark') => {
  const contexts = [
    <ThemeModeProvider key="theme" initialState={initialThemeMode} />,
    <LoadingCacheProvider key="loading" />,
    <UpdateStateProvider key="update" />,
  ]

  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <ComposeContextProvider contexts={contexts}>
        <BaseErrorBoundary>
          <SWRConfig value={swrConfig}>
            <WindowProvider>
              <AppDataProvider>
                <RouterProvider router={router} />
              </AppDataProvider>
            </WindowProvider>
          </SWRConfig>
        </BaseErrorBoundary>
      </ComposeContextProvider>
    </React.StrictMode>,
  )
}

// The "node-ports" window loads the same bundle but only renders its own small page.
const isNodePortsWindow = (() => {
  try {
    if (getCurrentWindow().label === 'node-ports') return true
  } catch {
    // not running inside Tauri
  }
  return new URLSearchParams(window.location.search).get('window') === 'node-ports'
})()

const bootstrapNodePortsWindow = async () => {
  let initialThemeMode: 'light' | 'dark' = 'dark'
  try {
    initialThemeMode = (await preloadAppData()).initialThemeMode
  } catch (error) {
    console.error('[main.tsx] Ports window preload failed:', error)
    await initializeLanguage(FALLBACK_LANGUAGE).catch(() => undefined)
  }
  createRoot(container).render(
    <React.StrictMode>
      <NodePortsWindow themeMode={initialThemeMode} />
    </React.StrictMode>,
  )
}

const bootstrap = async () => {
  if (isNodePortsWindow) {
    await bootstrapNodePortsWindow()
    return
  }
  const appDataPromise = preloadAppData()
  void preloadHomePageCards()

  const { initialThemeMode } = await appDataPromise
  initializeApp(initialThemeMode)
}

bootstrap().catch((error) => {
  console.error(
    '[main.tsx] App bootstrap failed, falling back to default language:',
    error,
  )
  initializeLanguage(FALLBACK_LANGUAGE)
    .catch((fallbackError) => {
      console.error(
        '[main.tsx] Fallback language initialization failed:',
        fallbackError,
      )
    })
    .finally(() => {
      initializeApp(resolveThemeMode(getPreloadConfig()))
    })
})

// Error handling
window.addEventListener('error', (event) => {
  console.error('[main.tsx] Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[main.tsx] Unhandled promise rejection:', event.reason)
})

// Page close/refresh events
window.addEventListener('beforeunload', () => {
  // Clean up all WebSocket instances to prevent memory leaks
  MihomoWebSocket.cleanupAll()
})

// Page loaded event
window.addEventListener('DOMContentLoaded', () => {
  // Clean up all WebSocket instances to prevent memory leaks
  MihomoWebSocket.cleanupAll()
})
