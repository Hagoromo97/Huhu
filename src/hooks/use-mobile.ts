import * as React from "react"

export const MOBILE_BREAKPOINT = 768
export const TABLET_BREAKPOINT = 1024

export type DeviceType = "mobile" | "tablet" | "desktop"

function getDeviceType(width: number): DeviceType {
  if (width < MOBILE_BREAKPOINT) return "mobile"
  if (width < TABLET_BREAKPOINT) return "tablet"
  return "desktop"
}

function getViewportWidth() {
  if (typeof window === "undefined") return TABLET_BREAKPOINT
  return window.visualViewport?.width ?? window.innerWidth
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(getViewportWidth() < MOBILE_BREAKPOINT)
    }

    onChange()
    mql.addEventListener("change", onChange)
    window.addEventListener("orientationchange", onChange)
    window.visualViewport?.addEventListener("resize", onChange)

    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener("orientationchange", onChange)
      window.visualViewport?.removeEventListener("resize", onChange)
    }
  }, [])

  return !!isMobile
}

export function useDeviceType(): DeviceType {
  const [device, setDevice] = React.useState<DeviceType>(() =>
    typeof window !== "undefined" ? getDeviceType(getViewportWidth()) : "desktop"
  )

  React.useEffect(() => {
    const update = () => setDevice(getDeviceType(getViewportWidth()))
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    window.visualViewport?.addEventListener("resize", update)
    update()

    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])

  return device
}

export function useIsTablet() {
  return useDeviceType() === "tablet"
}

export function useIsDesktop() {
  return useDeviceType() === "desktop"
}
