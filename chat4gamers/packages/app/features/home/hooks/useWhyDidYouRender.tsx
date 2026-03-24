import { useEffect, useRef } from 'react'

export function useWhyDidYouRender(name: string, props: Record<string, any>) {
  const prev = useRef(props)
  useEffect(() => {
    const changed = Object.entries(props).filter(([k, v]) => prev.current[k] !== v)
    if (changed.length) {
      console.log(`[${name}] re-rendered because:`, Object.fromEntries(changed))
    }
    prev.current = props
  })
}
