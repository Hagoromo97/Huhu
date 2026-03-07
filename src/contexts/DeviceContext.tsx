import * as React from "react"
import {
  useDeviceProfile,
  type DeviceType,
  type DevicePlatform,
  type DeviceOrientation,
  type DeviceFormFactor,
} from "@/hooks/use-mobile"

interface DeviceContextValue {
  device: DeviceType
  platform: DevicePlatform
  formFactor: DeviceFormFactor
  orientation: DeviceOrientation
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouch: boolean
  isStandalonePwa: boolean
  prefersReducedMotion: boolean
  viewportWidth: number
  viewportHeight: number
  isCompact: boolean
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
  platform: "unknown",
  formFactor: "desktop",
  orientation: "landscape",
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouch: false,
  isStandalonePwa: false,
  prefersReducedMotion: false,
  viewportWidth: 1280,
  viewportHeight: 800,
  isCompact: false,
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
  const profile = useDeviceProfile()
  const {
    device,
    platform,
    formFactor,
    orientation,
    width,
    height,
    isTouch,
    isStandalonePwa,
    prefersReducedMotion,
  } = profile

  const isMobile  = device === "mobile"
  const isTablet  = device === "tablet"
  const isDesktop = device === "desktop"
  const isCompact = width < 960 || (isMobile && orientation === "landscape")
  // Slight global downscale to keep the app a bit more compact.
  const fontScale = isMobile ? 0.88 : isTablet ? 0.94 : 0.98

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
    html.setAttribute("data-platform", platform)
    html.setAttribute("data-form-factor", formFactor)
    html.setAttribute("data-orientation", orientation)
    html.setAttribute("data-touch", isTouch ? "true" : "false")
    html.setAttribute("data-pwa", isStandalonePwa ? "true" : "false")
    html.setAttribute("data-motion", prefersReducedMotion ? "reduced" : "full")
    html.setAttribute("data-compact", isCompact ? "true" : "false")
    html.setAttribute("data-density", isMobile ? "compact" : isTablet ? "comfortable" : "spacious")
    // Fluid font scale via CSS custom property
    html.style.setProperty("--app-font-scale", String(fontScale))
    html.style.setProperty("--app-vh", `${height}px`)
    applyViewportVars()

    window.addEventListener("resize", applyViewportVars)
    window.addEventListener("orientationchange", applyViewportVars)
    window.visualViewport?.addEventListener("resize", applyViewportVars)

    return () => {
      window.removeEventListener("resize", applyViewportVars)
      window.removeEventListener("orientationchange", applyViewportVars)
      window.visualViewport?.removeEventListener("resize", applyViewportVars)
    }
  }, [
    device,
    platform,
    formFactor,
    orientation,
    isTouch,
    isStandalonePwa,
    prefersReducedMotion,
    isCompact,
    fontScale,
    isMobile,
    isTablet,
    height,
  ])

  const value = React.useMemo<DeviceContextValue>(
    () => ({
      device,
      platform,
      formFactor,
      orientation,
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      isStandalonePwa,
      prefersReducedMotion,
      viewportWidth: width,
      viewportHeight: height,
      isCompact,
      fontScale,
    }),
    [
      device,
      platform,
      formFactor,
      orientation,
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      isStandalonePwa,
      prefersReducedMotion,
      width,
      height,
      isCompact,
      fontScale,
    ]
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
