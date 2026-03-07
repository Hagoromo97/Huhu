import { useMemo, useState, useEffect, useRef } from "react"
import { GoogleMap, useLoadScript, InfoWindow } from "@react-google-maps/api"
import { DELIVERY_COLORS } from "@/lib/delivery"

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ""
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LIBRARIES = ["marker"] as any

interface DeliveryPoint {
  code: string
  name: string
  delivery: "Daily" | "Weekday" | "Alt 1" | "Alt 2"
  latitude: number
  longitude: number
  descriptions: { key: string; value: string }[]
  markerId?: string
  routeName?: string
  isFromAnotherRoute?: boolean
}

interface DeliveryMapProps {
  deliveryPoints: DeliveryPoint[]
  scrollZoom?: boolean
  markerStyle?: "standard" | "dot" | "ring" | "diamond"
  colorByRoute?: boolean
  showRouteLines?: boolean
  startPoint?: { lat: number; lng: number }
}

const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  mapId: "DEMO_MAP_ID",
}

function getMarkerBaseSize(markerStyle: "dot" | "ring" | "diamond") {
  if (markerStyle === "ring") return 16
  if (markerStyle === "diamond") return 14
  return 14
}

/** Colored marker HTMLElement for AdvancedMarkerElement */
function createDotElement(
  color: string,
  markerStyle: "dot" | "ring" | "diamond",
  isFromAnotherRoute = false,
): HTMLElement {
  const baseSize = getMarkerBaseSize(markerStyle)
  const dot = document.createElement("div")

  if (markerStyle === "ring") {
    dot.style.cssText = `
      width: ${baseSize}px;
      height: ${baseSize}px;
      border: 2.5px solid ${color};
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      cursor: pointer;
      transition: width 0.15s ease, height 0.15s ease;
      opacity: ${isFromAnotherRoute ? "0.75" : "1"};
    `
  } else if (markerStyle === "diamond") {
    dot.style.cssText = `
      width: ${baseSize}px;
      height: ${baseSize}px;
      background: ${color};
      border: 2px solid white;
      transform: rotate(45deg);
      border-radius: 3px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      cursor: pointer;
      transition: width 0.15s ease, height 0.15s ease;
      opacity: ${isFromAnotherRoute ? "0.75" : "1"};
    `
  } else {
    dot.style.cssText = `
      width: ${baseSize}px;
      height: ${baseSize}px;
      background: ${color};
      border: 2.5px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      cursor: pointer;
      transition: width 0.15s ease, height 0.15s ease;
      opacity: ${isFromAnotherRoute ? "0.75" : "1"};
    `
  }

  return dot
}

export function DeliveryMap({
  deliveryPoints,
  scrollZoom = false,
  markerStyle = "standard",
  colorByRoute = false,
  showRouteLines = false,
  startPoint,
}: DeliveryMapProps) {
  const { isLoaded } = useLoadScript({ googleMapsApiKey: GMAP_KEY, libraries: LIBRARIES })
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null)
  const [mapInstance,  setMapInstance]  = useState<google.maps.Map | null>(null)

  const markersRef = useRef<Array<{
    marker: google.maps.Marker | google.maps.marker.AdvancedMarkerElement
    el?: HTMLElement
    markerId: string
    baseSize?: number
  }>>([])
  const polylinesRef = useRef<google.maps.Polyline[]>([])
  const startPointMarkerRef = useRef<google.maps.Marker | null>(null)

  const ROUTE_COLOR_PALETTE = [
    "#0ea5e9", "#22c55e", "#f97316", "#ef4444", "#8b5cf6", "#14b8a6", "#eab308", "#ec4899",
  ]

  const isValidStartPoint = useMemo(() => {
    if (!startPoint) return false
    return Number.isFinite(startPoint.lat) && Number.isFinite(startPoint.lng)
  }, [startPoint])

  const getRouteColor = (routeName?: string) => {
    if (!routeName) return "#0ea5e9"
    let hash = 0
    for (let i = 0; i < routeName.length; i += 1) {
      hash = (hash * 31 + routeName.charCodeAt(i)) | 0
    }
    const idx = Math.abs(hash) % ROUTE_COLOR_PALETTE.length
    return ROUTE_COLOR_PALETTE[idx]
  }

  const getPointColor = (point: DeliveryPoint) => {
    if (colorByRoute) return getRouteColor(point.routeName)
    return DELIVERY_COLORS[point.delivery] ?? "#6b7280"
  }

  const validPoints = useMemo(
    () => deliveryPoints.filter((p) => p.latitude !== 0 && p.longitude !== 0),
    [deliveryPoints]
  )

  const activePoint = useMemo(
    () => validPoints.find(p => (p.markerId ?? p.code) === activeMarkerId) ?? null,
    [validPoints, activeMarkerId]
  )

  const center = useMemo(() => {
    if (isValidStartPoint && startPoint) {
      return { lat: startPoint.lat, lng: startPoint.lng }
    }
    if (validPoints.length === 0) return { lat: 3.15, lng: 101.65 }
    return {
      lat: validPoints.reduce((s, p) => s + p.latitude, 0) / validPoints.length,
      lng: validPoints.reduce((s, p) => s + p.longitude, 0) / validPoints.length,
    }
  }, [validPoints, isValidStartPoint, startPoint])

  // Create markers for each point (default or custom advanced marker)
  useEffect(() => {
    if (!mapInstance) return
    markersRef.current.forEach(({ marker }) => {
      if ("setMap" in marker) marker.setMap(null)
      else marker.map = null
    })
    markersRef.current = []

    validPoints.forEach(point => {
      const markerId = point.markerId ?? point.code
      if (markerStyle === "standard") {
        const marker = new google.maps.Marker({
          map: mapInstance,
          position: { lat: point.latitude, lng: point.longitude },
          title: point.name,
          opacity: point.isFromAnotherRoute ? 0.75 : 1,
        })

        marker.addListener("click", () =>
          setActiveMarkerId(prev => prev === markerId ? null : markerId)
        )

        markersRef.current.push({ marker, markerId })
        return
      }

      const color = getPointColor(point)
      const baseSize = getMarkerBaseSize(markerStyle)
      const el = createDotElement(color, markerStyle, point.isFromAnotherRoute === true)

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance,
        position: { lat: point.latitude, lng: point.longitude },
        content: el,
        title: point.name,
      })

      marker.addListener("click", () =>
        setActiveMarkerId(prev => prev === markerId ? null : markerId)
      )

      markersRef.current.push({ marker, el, markerId, baseSize })
    })

    return () => {
      markersRef.current.forEach(({ marker }) => {
        if ("setMap" in marker) marker.setMap(null)
        else marker.map = null
      })
      markersRef.current = []
    }
  }, [mapInstance, validPoints, markerStyle, colorByRoute])

  // Apply color on standard markers when route-based coloring is enabled.
  useEffect(() => {
    if (!mapInstance || markerStyle !== "standard") return

    markersRef.current.forEach(({ marker, markerId }) => {
      if (!(marker instanceof google.maps.Marker)) return
      const point = validPoints.find((p) => (p.markerId ?? p.code) === markerId)
      if (!point) return
      const markerColor = getPointColor(point)
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: markerColor,
        fillOpacity: point.isFromAnotherRoute ? 0.75 : 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        scale: 8,
      })
    })
  }, [mapInstance, markerStyle, validPoints, colorByRoute])

  // Draw optional route lines and starting point marker.
  useEffect(() => {
    if (!mapInstance) return

    polylinesRef.current.forEach((line) => line.setMap(null))
    polylinesRef.current = []
    if (startPointMarkerRef.current) {
      startPointMarkerRef.current.setMap(null)
      startPointMarkerRef.current = null
    }

    if (isValidStartPoint && startPoint) {
      startPointMarkerRef.current = new google.maps.Marker({
        map: mapInstance,
        position: { lat: startPoint.lat, lng: startPoint.lng },
        title: "Starting Point",
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          fillColor: "#111827",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
          scale: 5,
        },
      })
    }

    if (!showRouteLines || validPoints.length < 2) return

    const byRoute = new Map<string, DeliveryPoint[]>()
    validPoints.forEach((point) => {
      const key = point.routeName ?? "current"
      if (!byRoute.has(key)) byRoute.set(key, [])
      byRoute.get(key)!.push(point)
    })

    byRoute.forEach((points, routeName) => {
      if (points.length < 2) return
      const line = new google.maps.Polyline({
        map: mapInstance,
        path: points.map((p) => ({ lat: p.latitude, lng: p.longitude })),
        geodesic: true,
        strokeColor: colorByRoute ? getRouteColor(routeName) : "#0ea5e9",
        strokeOpacity: 0.65,
        strokeWeight: 3,
      })
      polylinesRef.current.push(line)
    })

    return () => {
      polylinesRef.current.forEach((line) => line.setMap(null))
      polylinesRef.current = []
      if (startPointMarkerRef.current) {
        startPointMarkerRef.current.setMap(null)
        startPointMarkerRef.current = null
      }
    }
  }, [mapInstance, validPoints, showRouteLines, colorByRoute, isValidStartPoint, startPoint])

  // Scale active marker without recreating
  useEffect(() => {
    markersRef.current.forEach(({ el, markerId, baseSize }) => {
      if (!el || !baseSize) return
      const isActive = markerId === activeMarkerId
      el.style.width = `${isActive ? baseSize + 4 : baseSize}px`
      el.style.height = `${isActive ? baseSize + 4 : baseSize}px`
      el.style.boxShadow = isActive
        ? "0 0 0 3px rgba(255,255,255,0.7), 0 3px 10px rgba(0,0,0,0.4)"
        : "0 2px 6px rgba(0,0,0,0.35)"
    })
  }, [activeMarkerId])

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={center}
      zoom={13}
      options={{
        ...MAP_OPTIONS,
        scrollwheel: scrollZoom,
        gestureHandling: scrollZoom ? "greedy" : "cooperative",
      }}
      onLoad={(map) => {
        setMapInstance(map)
        if (validPoints.length > 1) {
          const bounds = new google.maps.LatLngBounds()
          validPoints.forEach(p => bounds.extend({ lat: p.latitude, lng: p.longitude }))
          if (isValidStartPoint && startPoint) {
            bounds.extend({ lat: startPoint.lat, lng: startPoint.lng })
          }
          map.fitBounds(bounds, 30)
        } else if (validPoints.length === 1) {
          map.setCenter({ lat: validPoints[0].latitude, lng: validPoints[0].longitude })
          map.setZoom(13)
        } else if (isValidStartPoint && startPoint) {
          map.setCenter({ lat: startPoint.lat, lng: startPoint.lng })
          map.setZoom(12)
        }
      }}
      onClick={() => setActiveMarkerId(null)}
    >
      {activePoint && (
        <InfoWindow
          position={{ lat: activePoint.latitude, lng: activePoint.longitude }}
          onCloseClick={() => setActiveMarkerId(null)}
          options={{ pixelOffset: new google.maps.Size(0, -12) }}
        >
          <div className="text-sm">
            <strong className="block mb-1">{activePoint.name}</strong>
            <div className="text-xs text-gray-500 space-y-0.5">
              {activePoint.routeName && <div>Route: {activePoint.routeName}</div>}
              <div>Code: {activePoint.code}</div>
              <div>Delivery: {activePoint.delivery}</div>
              <div className="font-mono">{activePoint.latitude.toFixed(4)}, {activePoint.longitude.toFixed(4)}</div>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}
