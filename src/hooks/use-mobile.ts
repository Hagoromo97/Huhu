import * as React from "react"

export const MOBILE_BREAKPOINT = 768
export const TABLET_BREAKPOINT = 1024

export type DeviceType = "mobile" | "tablet" | "desktop"
export type DevicePlatform = "ios" | "android" | "windows" | "macos" | "linux" | "unknown"
export type DeviceFormFactor = "phone" | "tablet" | "desktop"
export type DeviceOrientation = "portrait" | "landscape"

export interface DeviceProfile {
  device: DeviceType
  platform: DevicePlatform
  formFactor: DeviceFormFactor
  orientation: DeviceOrientation
  width: number
  height: number
  pixelRatio: number
  isTouch: boolean
  isStandalonePwa: boolean
  prefersReducedMotion: boolean
}

function getDeviceType(width: number): DeviceType {
  if (width < MOBILE_BREAKPOINT) return "mobile"
  if (width < TABLET_BREAKPOINT) return "tablet"
  return "desktop"
}

function getViewportWidth() {
  if (typeof window === "undefined") return TABLET_BREAKPOINT
  return window.visualViewport?.width ?? window.innerWidth
}

function getViewportHeight() {
  if (typeof window === "undefined") return TABLET_BREAKPOINT
  return window.visualViewport?.height ?? window.innerHeight
}

function getPlatform(userAgent: string, platform: string): DevicePlatform {
  const ua = userAgent.toLowerCase()
  const pf = platform.toLowerCase()

  if (/iphone|ipad|ipod/.test(ua) || pf.includes("iphone") || pf.includes("ipad")) return "ios"
  if (ua.includes("android")) return "android"
  if (pf.includes("win") || ua.includes("windows")) return "windows"
  if (pf.includes("mac") || ua.includes("mac os")) return "macos"
  if (pf.includes("linux") || ua.includes("linux")) return "linux"
  return "unknown"
}

function getOrientation(width: number, height: number): DeviceOrientation {
  return width >= height ? "landscape" : "portrait"
}

function isStandalonePwaMode(): boolean {
  if (typeof window === "undefined") return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone)
}

function getFormFactor(device: DeviceType, width: number): DeviceFormFactor {
  if (device === "desktop") return "desktop"
  if (device === "tablet") return "tablet"
  // Large phones in landscape can still behave like compact tablets.
  return width >= 560 ? "tablet" : "phone"
}

function getProfile(): DeviceProfile {
  const width = Math.round(getViewportWidth())
  const height = Math.round(getViewportHeight())
  const device = getDeviceType(width)
  const nav = typeof navigator !== "undefined" ? navigator : undefined
  const platform = getPlatform(nav?.userAgent ?? "", nav?.platform ?? "")
  const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || (nav?.maxTouchPoints ?? 0) > 0)
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  return {
    device,
    platform,
    formFactor: getFormFactor(device, width),
    orientation: getOrientation(width, height),
    width,
    height,
    pixelRatio: typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    isTouch,
    isStandalonePwa: isStandalonePwaMode(),
    prefersReducedMotion,
  }
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

export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = React.useState<DeviceProfile>(() =>
    typeof window !== "undefined"
      ? getProfile()
      : {
          device: "desktop",
          platform: "unknown",
          formFactor: "desktop",
          orientation: "landscape",
          width: TABLET_BREAKPOINT,
          height: TABLET_BREAKPOINT,
          pixelRatio: 1,
          isTouch: false,
          isStandalonePwa: false,
          prefersReducedMotion: false,
        }
  )

  React.useEffect(() => {
    let frame = 0

    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setProfile(getProfile()))
    }

    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const standaloneMq = window.matchMedia("(display-mode: standalone)")

    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    window.visualViewport?.addEventListener("resize", update)
    reducedMotionMq.addEventListener("change", update)
    standaloneMq.addEventListener("change", update)
    update()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
      window.visualViewport?.removeEventListener("resize", update)
      reducedMotionMq.removeEventListener("change", update)
      standaloneMq.removeEventListener("change", update)
    }
  }, [])

  return profile
}

export function useIsTablet() {
  return useDeviceType() === "tablet"
}

export function useIsDesktop() {
  return useDeviceType() === "desktop"
}
