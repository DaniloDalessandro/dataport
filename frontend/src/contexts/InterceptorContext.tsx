"use client"

import { createContext, useContext } from "react"

// Temporary stub for InterceptorContext
const InterceptorContext = createContext({})

export function InterceptorProvider({ children }: { children: React.ReactNode }) {
  return (
    <InterceptorContext.Provider value={{}}>
      {children}
    </InterceptorContext.Provider>
  )
}

export function useInterceptor() {
  return useContext(InterceptorContext)
}

export default InterceptorContext
