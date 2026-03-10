import * as React from "react"

export const MOBILE_BREAKPOINT = 768
export const TABLET_BREAKPOINT = 1024

export type DeviceType = "mobile" | "tablet" | "desktop"

function getDeviceType(width: number): DeviceType {
  if (width < MOBILE_BREAKPOINT) return "mobile"
  if (width < TABLET_BREAKPOINT) return "tablet"
  return "desktop"
}

function getViewportWidth(): number {
  if (typeof window === "undefined") return TABLET_BREAKPOINT
  const vv = window.visualViewport?.width
  return typeof vv === "number" && Number.isFinite(vv) ? vv : window.innerWidth
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false
  return "ontouchstart" in window || navigator.maxTouchPoints > 0
}

function shouldUseMobileLayout(width: number): boolean {
  // iPad/tablet touch devices get the mobile/sidebar sheet layout up to 1024px
  if (isTouchDevice() && width < TABLET_BREAKPOINT) return true
  return width < MOBILE_BREAKPOINT
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const onChange = () => {
      setIsMobile(shouldUseMobileLayout(getViewportWidth()))
    }

    window.addEventListener("resize", onChange)
    window.visualViewport?.addEventListener("resize", onChange)
    window.addEventListener("orientationchange", onChange)
    onChange()

    return () => {
      window.removeEventListener("resize", onChange)
      window.visualViewport?.removeEventListener("resize", onChange)
      window.removeEventListener("orientationchange", onChange)
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
    window.visualViewport?.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    update()
    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
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
