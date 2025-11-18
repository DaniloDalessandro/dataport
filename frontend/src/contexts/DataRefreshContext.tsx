'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react"

type RefreshHandler = () => void | Promise<void>

interface DataRefreshContextValue {
  registerRefresh: (key: string, handler: RefreshHandler) => void
  unregisterRefresh: (key: string, handler: RefreshHandler) => void
  triggerRefresh: (key: string) => Promise<void>
  triggerAll: () => Promise<void>
}

const DataRefreshContext = createContext<DataRefreshContextValue | undefined>(
  undefined,
)

export function DataRefreshProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const handlersRef = useRef<Map<string, Set<RefreshHandler>>>(new Map())

  const registerRefresh = useCallback(
    (key: string, handler: RefreshHandler) => {
      if (!key || typeof handler !== "function") {
        return
      }

      const handlers = handlersRef.current.get(key) ?? new Set<RefreshHandler>()
      handlers.add(handler)
      handlersRef.current.set(key, handlers)
    },
    [],
  )

  const unregisterRefresh = useCallback((key: string, handler: RefreshHandler) => {
    const handlers = handlersRef.current.get(key)
    if (!handlers) {
      return
    }

    handlers.delete(handler)

    if (handlers.size === 0) {
      handlersRef.current.delete(key)
    }
  }, [])

  const triggerRefresh = useCallback(async (key: string) => {
    const handlers = handlersRef.current.get(key)
    if (!handlers || handlers.size === 0) {
      return
    }

    await Promise.allSettled(
      Array.from(handlers).map(async (handler) => {
        await handler()
      }),
    )
  }, [])

  const triggerAll = useCallback(async () => {
    const promises: Promise<unknown>[] = []

    handlersRef.current.forEach((handlers) => {
      handlers.forEach((handler) => {
        promises.push(
          Promise.resolve()
            .then(() => handler())
            .catch((error) => {
              console.warn("Falha ao executar refresh handler:", error)
            }),
        )
      })
    })

    await Promise.allSettled(promises)
  }, [])

  const contextValue = useMemo<DataRefreshContextValue>(
    () => ({
      registerRefresh,
      unregisterRefresh,
      triggerRefresh,
      triggerAll,
    }),
    [registerRefresh, triggerAll, triggerRefresh, unregisterRefresh],
  )

  return (
    <DataRefreshContext.Provider value={contextValue}>
      {children}
    </DataRefreshContext.Provider>
  )
}

function useDataRefresh() {
  const context = useContext(DataRefreshContext)

  if (!context) {
    throw new Error(
      "useDataRefresh deve ser utilizado dentro de DataRefreshProvider",
    )
  }

  return context
}

export function useRegisterRefresh(key: string, handler: RefreshHandler) {
  const { registerRefresh, unregisterRefresh } = useDataRefresh()

  useEffect(() => {
    registerRefresh(key, handler)

    return () => {
      unregisterRefresh(key, handler)
    }
  }, [handler, key, registerRefresh, unregisterRefresh])
}

export function useRefreshActions() {
  const { triggerRefresh, triggerAll } = useDataRefresh()
  return { triggerRefresh, triggerAll }
}
