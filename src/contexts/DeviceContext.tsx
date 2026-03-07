import * as React from "react"
import { useDeviceType, type DeviceType } from "@/hooks/use-mobile"

interface DeviceContextValue {
  device: DeviceType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouch: boolean
  /** CSS-friendly font scale factor — 0.86 on mobile, 0.925 on tablet, 0.975 on desktop */
  fontScale: number
}

function getViewportMetrics() {
  const viewport = window.visualViewport
  const width = viewport?.width ?? window.innerWidth
  const height = viewport?.height ?? window.innerHeight
  return {
    width: Math.round(width),
    height: Math.round(height),
    scale: viewport?.scale ?? 1,
  }
}

const DeviceContext = React.createContext<DeviceContextValue>({
  device: "desktop",
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouch: false,
  fontScale: 1,
})

/**
 * DeviceProvider
 * – Detects device type (mobile / tablet / desktop) via window resize listener.
 * – Writes `data-device` and `data-touch` to the root <html> element so CSS
 *   can target each breakpoint with plain attribute selectors.
 * – Adjusts `--app-font-scale` CSS custom property so every rem-based value
 *   scales uniformly without touching individual component classes.
 */
export function DeviceProvider({ children }: { children: React.ReactNode }) {
  const device = useDeviceType()

  const isMobile  = device === "mobile"
  const isTablet  = device === "tablet"
  const isDesktop = device === "desktop"
  const isTouch   = React.useMemo(
    () => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    []
  )
  // Slight global downscale to keep the app a bit more compact.
  const fontScale = isMobile ? 0.86 : isTablet ? 0.925 : 0.975

  // Sync HTML data-attributes whenever device changes
  React.useEffect(() => {
    const html = document.documentElement
    const applyViewportVars = () => {
      const metrics = getViewportMetrics()
      html.style.setProperty("--device-vw", `${metrics.width}px`)
      html.style.setProperty("--device-vh", `${metrics.height}px`)
      html.style.setProperty("--device-scale", String(metrics.scale))
    }

    html.setAttribute("data-device", device)
    html.setAttribute("data-touch", isTouch ? "true" : "false")
    html.setAttribute("data-density", isMobile ? "compact" : isTablet ? "comfortable" : "spacious")
    // Fluid font scale via CSS custom property
    html.style.setProperty("--app-font-scale", String(fontScale))
    applyViewportVars()

    window.addEventListener("resize", applyViewportVars)
    window.addEventListener("orientationchange", applyViewportVars)
    window.visualViewport?.addEventListener("resize", applyViewportVars)

    return () => {
      window.removeEventListener("resize", applyViewportVars)
      window.removeEventListener("orientationchange", applyViewportVars)
      window.visualViewport?.removeEventListener("resize", applyViewportVars)
    }
  }, [device, isTouch, fontScale, isMobile, isTablet])

  const value = React.useMemo<DeviceContextValue>(
    () => ({ device, isMobile, isTablet, isDesktop, isTouch, fontScale }),
    [device, isMobile, isTablet, isDesktop, isTouch, fontScale]
  )

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice() {
  return React.useContext(DeviceContext)
}
