import { useState, useMemo, useEffect, useCallback, type CSSProperties } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Users,
  Clock,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useEditMode } from "@/contexts/EditModeContext"
import { isSameDay } from "@/lib/date-utils"

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Resource {
  id: string
  name: string
  role: string
  color: string
}

interface Shift {
  id: string
  resourceId: string
  title: string
  date: string   // "YYYY-MM-DD"
  startHour: number  // 0-23
  endHour: number    // 1-24
  color: string
}

interface RouteCardOption {
  id: string
  name: string
  shift: string
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
]

const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => {
  if (i === 0) return "12 AM"
  if (i < 12) return `${i} AM`
  if (i === 12) return "12 PM"
  return `${i - 12} PM`
})

const RESOURCE_COLORS = [
  "#3B82F6", "#F97316", "#22C55E", "#A855F7",
  "#EC4899", "#EAB308", "#14B8A6", "#EF4444",
]

const SHIFT_COLORS = [
  { label: "Blue",   value: "#3B82F6" },
  { label: "Green",  value: "#22C55E" },
  { label: "Orange", value: "#F97316" },
  { label: "Purple", value: "#A855F7" },
  { label: "Pink",   value: "#EC4899" },
  { label: "Teal",   value: "#14B8A6" },
  { label: "Red",    value: "#EF4444" },
  { label: "Yellow", value: "#EAB308" },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate)
  const day = d.getDay() // 0=Sun
  d.setDate(d.getDate() - day) // go to Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(d)
    nd.setDate(d.getDate() + i)
    return nd
  })
}

function getMonthDates(baseDate: Date): Date[] {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: lastDay }, (_, i) => new Date(year, month, i + 1))
}

function toDateKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatHour(h: number) {
  if (h === 0) return "12:00 AM"
  if (h < 12) return `${h}:00 AM`
  if (h === 12) return "12:00 PM"
  return `${h - 12}:00 PM`
}

// ─── API HELPERS ──────────────────────────────────────────────────────────────

async function apiFetchAll(): Promise<{ resources: Resource[]; shifts: Shift[] }> {
  try {
    const res = await fetch("/api/rooster")
    const json = await res.json()
    if (!json.success) return { resources: [], shifts: [] }
    const resources: Resource[] = json.resources.map((r: Record<string, string>) => ({
      id: r.id, name: r.name, role: r.role, color: r.color,
    }))
    const shifts: Shift[] = json.shifts.map((s: Record<string, string | number>) => ({
      id: String(s.id),
      resourceId: String(s.resource_id),
      title: String(s.title),
      date: String(s.shift_date).slice(0, 10),
      startHour: Number(s.start_hour),
      endHour: Number(s.end_hour),
      color: String(s.color),
    }))
    return { resources, shifts }
  } catch {
    return { resources: [], shifts: [] }
  }
}

async function apiSaveResource(r: Resource): Promise<boolean> {
  try {
    const res = await fetch("/api/rooster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "resource", id: r.id, name: r.name, role: r.role, color: r.color }),
    })
    const json = await res.json()
    return json.success === true
  } catch { return false }
}

async function apiDeleteResource(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/rooster?type=resource&id=${encodeURIComponent(id)}`, { method: "DELETE" })
    const json = await res.json()
    return json.success === true
  } catch { return false }
}

async function apiSaveShift(s: Shift): Promise<boolean> {
  try {
    const res = await fetch("/api/rooster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "shift",
        id: s.id,
        resource_id: s.resourceId,
        title: s.title,
        shift_date: s.date,
        start_hour: s.startHour,
        end_hour: s.endHour,
        color: s.color,
      }),
    })
    const json = await res.json()
    return json.success === true
  } catch { return false }
}

async function apiDeleteShift(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/rooster?type=shift&id=${encodeURIComponent(id)}`, { method: "DELETE" })
    const json = await res.json()
    return json.success === true
  } catch { return false }
}

async function apiFetchRouteCards(): Promise<RouteCardOption[]> {
  try {
    const res = await fetch("/api/routes")
    const json = await res.json()
    if (json.success !== true || !Array.isArray(json.data)) return []
    return json.data.map((r: Record<string, string>) => ({
      id: String(r.id),
      name: String(r.name),
      shift: String(r.shift ?? "AM"),
    }))
  } catch {
    return []
  }
}

function normalizeRouteLabel(name: string) {
  return name.replace(/^route\s+/i, "").trim()
}

function normalizeStyle(shift: string): "AM" | "PM" {
  return shift.toUpperCase() === "PM" ? "PM" : "AM"
}

function getStyleDefaults(style: "AM" | "PM") {
  return style === "PM"
    ? { startHour: 12, endHour: 20, color: "#F97316" }
    : { startHour: 8, endHour: 16, color: "#3B82F6" }
}

function buildRouteEventTitle(routeName: string, style: "AM" | "PM") {
  return `${normalizeRouteLabel(routeName)} - ${style}`
}

function buildRouteTitleFromOption(route?: RouteCardOption) {
  if (!route) return ""
  return buildRouteEventTitle(route.name, normalizeStyle(route.shift))
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const SEED_RESOURCES: Resource[] = [
  { id: "r1", name: "Ahmad Faris",    role: "Driver",    color: RESOURCE_COLORS[0] },
  { id: "r2", name: "Siti Aminah",    role: "Operator",  color: RESOURCE_COLORS[1] },
  { id: "r3", name: "Mohd Hazwan",    role: "Driver",    color: RESOURCE_COLORS[2] },
  { id: "r4", name: "Nurul Izzati",   role: "Supervisor",color: RESOURCE_COLORS[3] },
  { id: "r5", name: "Khairul Azman",  role: "Operator",  color: RESOURCE_COLORS[4] },
]

function makeSeedShifts(resources: Resource[]): Shift[] {
  const today = new Date()
  const week = getWeekDates(today)
  const shifts: Shift[] = []
  let sid = 1
  const shiftTemplates = [
    { title: "Morning",   startHour: 7,  endHour: 15, color: "#3B82F6" },
    { title: "Afternoon", startHour: 12, endHour: 20, color: "#F97316" },
    { title: "Night",     startHour: 20, endHour: 24, color: "#A855F7" },
    { title: "Morning",   startHour: 6,  endHour: 14, color: "#22C55E" },
  ]
  resources.forEach((res, ri) => {
    ;[1, 2, 3, 4, 5].forEach((dayOffset) => {
      const date = toDateKey(week[dayOffset])
      const tmpl = shiftTemplates[ri % shiftTemplates.length]
      shifts.push({
        id: `seed_s${sid++}`,
        resourceId: res.id,
        title: tmpl.title,
        date,
        startHour: tmpl.startHour,
        endHour: tmpl.endHour,
        color: tmpl.color,
      })
    })
  })
  return shifts
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

type ViewMode = "week" | "day"

export function Rooster({
  viewMode: controlledViewMode,
}: {
  viewMode?: ViewMode
}) {
  const today = new Date()
  const { isEditMode } = useEditMode()

  const viewMode = controlledViewMode ?? "week"
  const [currentDate, setCurrentDate] = useState(new Date())
  const [resources, setResources] = useState<Resource[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [routeCards, setRouteCards] = useState<RouteCardOption[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState("")
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [shiftDialog, setShiftDialog] = useState<{
    open: boolean
    mode: "add" | "edit"
    shift?: Shift
  }>({ open: false, mode: "add" })

  const [resourceDialog, setResourceDialog] = useState<{
    open: boolean
    mode: "add" | "edit"
    resource?: Resource
  }>({ open: false, mode: "add" })

  // Load from DB on mount
  const loadData = useCallback(async () => {
    setLoading(true)
    const { resources: dbRes, shifts: dbShifts } = await apiFetchAll()
    if (dbRes.length === 0) {
      // Seed default data on first launch
      for (const r of SEED_RESOURCES) await apiSaveResource(r)
      const seedShifts = makeSeedShifts(SEED_RESOURCES)
      for (const s of seedShifts) await apiSaveShift(s)
      setResources(SEED_RESOURCES)
      setShifts(seedShifts)
    } else {
      setResources(dbRes)
      setShifts(dbShifts)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    let cancelled = false
    const loadRouteCards = async () => {
      const cards = await apiFetchRouteCards()
      if (cancelled) return
      if (cards.length > 0) {
        setRouteCards(cards)
        return
      }

      // Fallback: pinned routes from local storage when route API returns empty.
      try {
        const pinned = JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]")
        if (Array.isArray(pinned) && pinned.length > 0) {
          setRouteCards(
            pinned.map((r: { id: string; name: string; shift?: string }) => ({
              id: r.id,
              name: r.name,
              shift: r.shift ?? "AM",
            }))
          )
        }
      } catch {
        // Keep empty when no valid fallback data.
      }
    }
    loadRouteCards()
    return () => { cancelled = true }
  }, [])

  // Shift form state
  const [shiftForm, setShiftForm] = useState({
    title: "Morning",
    resourceId: resources[0]?.id ?? "",
    date: toDateKey(today),
    startHour: 8,
    endHour: 16,
    color: "#3B82F6",
  })

  // Resource form state
  const [resForm, setResForm] = useState({
    name: "",
    role: "",
    color: RESOURCE_COLORS[0],
  })

  // Derived date ranges
  const monthDates = useMemo(() => getMonthDates(currentDate), [currentDate])

  const headerLabel = useMemo(() => {
    if (viewMode === "day") {
      const d = currentDate
      return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
  }, [viewMode, currentDate])

  // Navigation
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate)
    if (viewMode === "day") d.setDate(d.getDate() + dir)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  // Column dates for current view
  const colDates: Date[] = viewMode === "week"
    ? monthDates
    : [currentDate]

  const weekGroups = useMemo(() => {
    if (viewMode !== "week") return [] as Array<{ weekNo: number; count: number }>
    const groups: Array<{ weekNo: number; count: number }> = []
    for (let i = 0; i < colDates.length; i += 7) {
      groups.push({ weekNo: groups.length + 1, count: Math.min(7, colDates.length - i) })
    }
    return groups
  }, [viewMode, colDates])

  const hourWidth = 44
  const dayColWidth = 140
  const timelineHours = 24
  const dayTimelineWidth = timelineHours * hourWidth
  const weekTableWidth = colDates.length * dayColWidth
  const gridRightWidth = viewMode === "week" ? weekTableWidth : dayTimelineWidth
  const dateIndexByKey = useMemo(
    () => new Map(colDates.map((d, i) => [toDateKey(d), i] as const)),
    [colDates]
  )

  // ── Shift CRUD ────────────────────────────────────────────────────────────

  const openAddShift = (resourceId?: string, date?: string) => {
    const firstRoute = routeCards[0]
    const inferredStyle = firstRoute ? normalizeStyle(firstRoute.shift) : "AM"
    const styleDefaults = getStyleDefaults(inferredStyle)
    setShiftForm({
      title: buildRouteTitleFromOption(firstRoute),
      resourceId: resourceId ?? resources[0]?.id ?? "",
      date: date ?? toDateKey(currentDate),
      startHour: styleDefaults.startHour,
      endHour: styleDefaults.endHour,
      color: styleDefaults.color,
    })
    setSelectedRouteId(firstRoute?.id ?? "")
    setShiftDialog({ open: true, mode: "add" })
  }

  const openEditShift = (shift: Shift) => {
    setShiftForm({
      title: shift.title,
      resourceId: shift.resourceId,
      date: shift.date,
      startHour: shift.startHour,
      endHour: shift.endHour,
      color: shift.color,
    })
    setShiftDialog({ open: true, mode: "edit", shift })
  }

  const saveShift = async () => {
    if (shiftDialog.mode === "add") {
      const selectedRoute = routeCards.find((r) => r.id === selectedRouteId)
      if (!selectedRoute) {
        toast.error("Please select a route")
        return
      }

      const autoStyle = normalizeStyle(selectedRoute.shift)
      const defaults = getStyleDefaults(autoStyle)
      const title = buildRouteEventTitle(selectedRoute.name, autoStyle)
      const newShift: Shift = {
        id: `s${Date.now()}`,
        ...shiftForm,
        title,
        startHour: defaults.startHour,
        endHour: defaults.endHour,
        color: defaults.color,
      }
      const ok = await apiSaveShift(newShift)
      if (ok) { setShifts(prev => [...prev, newShift]); toast.success("Shift added") }
      else toast.error("Failed to save shift")
    } else {
      if (!shiftForm.title.trim()) { toast.error("Please enter a shift title"); return }
      if (shiftForm.endHour <= shiftForm.startHour) { toast.error("End time must be after start time"); return }
      const updated: Shift = { ...shiftDialog.shift!, ...shiftForm, title: shiftForm.title.trim() }
      const ok = await apiSaveShift(updated)
      if (ok) {
        setShifts(prev => prev.map(s => s.id === updated.id ? updated : s))
        toast.success("Shift updated")
      } else toast.error("Failed to update shift")
    }
    setShiftDialog({ open: false, mode: "add" })
  }

  const deleteShift = async (id: string) => {
    const ok = await apiDeleteShift(id)
    if (ok) { setShifts(prev => prev.filter(s => s.id !== id)); toast.success("Shift removed") }
    else toast.error("Failed to delete shift")
  }

  // ── Resource CRUD ─────────────────────────────────────────────────────────

  const openAddResource = () => {
    setResForm({ name: "", role: "", color: RESOURCE_COLORS[resources.length % RESOURCE_COLORS.length] })
    setResourceDialog({ open: true, mode: "add" })
  }

  const openEditResource = (r: Resource) => {
    setResForm({ name: r.name, role: r.role, color: r.color })
    setResourceDialog({ open: true, mode: "edit", resource: r })
  }

  const saveResource = async () => {
    if (!resForm.name.trim()) { toast.error("Please enter a name"); return }
    if (resourceDialog.mode === "add") {
      const nr: Resource = { id: `r${Date.now()}`, name: resForm.name.trim(), role: resForm.role.trim(), color: resForm.color }
      const ok = await apiSaveResource(nr)
      if (ok) { setResources(prev => [...prev, nr]); toast.success("Staff added") }
      else toast.error("Failed to save staff")
    } else {
      const updated: Resource = { ...resourceDialog.resource!, ...resForm, name: resForm.name.trim(), role: resForm.role.trim() }
      const ok = await apiSaveResource(updated)
      if (ok) {
        setResources(prev => prev.map(r => r.id === updated.id ? updated : r))
        toast.success("Staff updated")
      } else toast.error("Failed to update staff")
    }
    setResourceDialog({ open: false, mode: "add" })
  }

  const deleteResource = async (id: string) => {
    const ok = await apiDeleteResource(id)
    if (ok) {
      setResources(prev => prev.filter(r => r.id !== id))
      setShifts(prev => prev.filter(s => s.resourceId !== id))
      toast.success("Staff removed")
    } else toast.error("Failed to delete staff")
  }

  const selectedRoute = routeCards.find((r) => r.id === selectedRouteId)
  const addEventPreview = buildRouteTitleFromOption(selectedRoute)
  const loadingLabel = "Loading Rooster"

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rooster-loading flex flex-1 items-center justify-center gap-2">
        <Loader2 className="size-5 animate-spin text-primary/90" />
        <span className="rooster-loading-text text-sm">
          <span className="rooster-loading-track" aria-label={loadingLabel} role="status">
            {loadingLabel.split("").map((char, index) => (
              <span
                key={`${char}-${index}`}
                className="rooster-loading-letter"
                style={{ ["--char-index" as "--char-index"]: index } as CSSProperties}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </span>
          <span className="ml-0.5 inline-flex" aria-hidden="true">
            <span className="rooster-loading-dot" style={{ animationDelay: "0s" }}>.</span>
            <span className="rooster-loading-dot" style={{ animationDelay: "0.2s" }}>.</span>
            <span className="rooster-loading-dot" style={{ animationDelay: "0.4s" }}>.</span>
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 items-center gap-3 px-4 py-4 border-b border-border/60 shrink-0 bg-background/80 backdrop-blur-sm sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        {/* Left spacer for balanced center title */}
        <div className="hidden md:block" />

        {/* Center label */}
        <h2 className="text-base font-bold text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/35 px-3 py-1">
            <Clock className="size-3.5 text-primary/90" aria-hidden="true" />
            <span>{headerLabel}</span>
          </span>
        </h2>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {/* Add shift — edit mode only */}
          {isEditMode && (
          <button
            onClick={() => openAddShift()}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="size-4" />
            Add Shift
          </button>
          )}

          {/* Add resource — edit mode only */}
          {isEditMode && (
          <button
            onClick={openAddResource}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 text-xs font-semibold transition-colors"
          >
            <Users className="size-4" />
            Add Staff
          </button>
          )}

          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={goToday}
            className="h-9 px-3 text-xs font-semibold rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Timeline grid ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto bg-background">
        {resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
            <Users className="size-10 opacity-30" />
            <div className="text-sm">No staff added yet</div>
            {isEditMode && (
              <button
                onClick={openAddResource}
                className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-3.5" />
                Add Staff
              </button>
            )}
          </div>
        ) : (
          <div className="min-w-max">
            <div className="grid" style={{ gridTemplateColumns: `220px ${gridRightWidth}px` }}>
              <div
                className="sticky top-0 left-0 z-30 bg-muted/[0.18] backdrop-blur-sm border-b border-r border-border/70 px-5 py-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]"
              >
                <Users className="size-4 shrink-0" />
                Staff
              </div>

              <div className="sticky top-0 z-20 border-b border-border/70 bg-background">
                {/* Week group header */}
                {viewMode === "week" ? (
                  <>
                    <div className="flex h-10 border-b border-border/40 bg-background">
                      {weekGroups.map((wg) => (
                        <div
                          key={wg.weekNo}
                          className="flex items-center justify-center text-xs font-semibold text-muted-foreground border-r border-border/40"
                          style={{ width: wg.count * dayColWidth }}
                        >
                          {`Week ${wg.weekNo} - ${MONTHS[currentDate.getMonth()]}, ${currentDate.getFullYear()}`}
                        </div>
                      ))}
                    </div>

                    <div className="flex h-10 border-b border-border/40 bg-muted/[0.14]">
                      {colDates.map((date) => {
                        const isToday = isSameDay(date, today)
                        return (
                          <div
                            key={toDateKey(date)}
                            className={`flex items-center justify-center text-xs font-semibold border-r border-border/35 ${isToday ? "text-primary" : "text-muted-foreground"}`}
                            style={{ width: dayColWidth }}
                          >
                            <span className="inline-flex items-center justify-center px-2 h-5 text-[10px] sm:px-2.5 sm:h-6 sm:text-[11px]">
                              {date.getDate()} - {DAYS_SHORT[date.getDay()]}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex h-10 border-b border-border/40">
                    {colDates.map((date) => {
                      const isToday = isSameDay(date, today)
                      return (
                        <div
                          key={toDateKey(date)}
                          className={`flex items-center justify-center gap-2 text-xs font-semibold border-r border-border/40 ${isToday ? "text-primary" : "text-muted-foreground"}`}
                          style={{ width: dayTimelineWidth }}
                        >
                          <span>{DAYS_SHORT[date.getDay()]}</span>
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] ${isToday ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                            {date.getDate()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Hour ruler */}
                {viewMode === "day" && (
                  <div className="relative flex h-10 bg-muted/[0.22]">
                    {Array.from({ length: timelineHours }, (_, h) => (
                      <div
                        key={h}
                        className={`h-full border-r text-[10px] leading-none flex items-end pb-2 justify-center ${h % 6 === 0 ? "border-border/70 text-muted-foreground" : "border-border/30 text-muted-foreground/70"}`}
                        style={{ width: hourWidth }}
                      >
                        {h % 2 === 0 ? HOUR_LABELS[h % 24].replace(":00", "") : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {resources.map((resource, ri) => {
                const rowShifts = shifts.filter(s => s.resourceId === resource.id && dateIndexByKey.has(s.date))
                return (
                  <div key={resource.id} style={{ display: "contents" }}>
                    <div
                      className="sticky left-0 z-10 bg-muted/[0.14] backdrop-blur-sm border-b border-r border-border/60 px-4 py-3 flex flex-col justify-center gap-1.5 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.10)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: resource.color }} />
                        <span className="text-sm font-semibold text-foreground leading-tight">{resource.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground ml-[20px] leading-tight">{resource.role}</div>
                      {isEditMode && (
                        <div className="flex items-center gap-1.5 mt-2 ml-[20px]">
                          <button onClick={e => { e.stopPropagation(); openEditResource(resource) }} className="h-6 w-6 flex items-center justify-center rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40" title="Edit staff">
                            <Pencil className="size-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteResource(resource.id) }} className="h-6 w-6 flex items-center justify-center rounded bg-muted/60 hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors border border-border/40" title="Delete staff">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {viewMode === "week" ? (
                      <div className={`flex border-b border-border/40 ${ri % 2 !== 0 ? "bg-muted/[0.03]" : "bg-background"}`} style={{ width: weekTableWidth }}>
                        {colDates.map((date) => {
                          const dateKey = toDateKey(date)
                          const dayShifts = rowShifts.filter(s => s.date === dateKey)
                          return (
                            <div
                              key={dateKey}
                              className={`min-h-[86px] border-r border-border/30 px-2 py-2 flex flex-col gap-1.5 ${isEditMode ? "cursor-pointer hover:bg-muted/20" : ""}`}
                              style={{ width: dayColWidth }}
                              onClick={() => { if (isEditMode) openAddShift(resource.id, dateKey) }}
                            >
                              {dayShifts.length === 0 ? (
                                <div className="text-[10px] text-muted-foreground/50 mt-1">-</div>
                              ) : (
                                dayShifts.map((shift) => (
                                  <button
                                    key={shift.id}
                                    onClick={(e) => { e.stopPropagation(); if (isEditMode) openEditShift(shift) }}
                                    className={`w-full px-0 py-0.5 text-center text-[10px] leading-tight text-foreground ${isEditMode ? "hover:underline underline-offset-2" : "cursor-default"}`}
                                    title={`${shift.title}: ${formatHour(shift.startHour)} - ${formatHour(shift.endHour)}`}
                                  >
                                    <div className="font-semibold truncate">{shift.title}</div>
                                    {isEditMode && (
                                      <div className="opacity-70 truncate">{shift.startHour}:00 - {shift.endHour}:00</div>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div
                        className={`relative h-[86px] border-b border-border/40 ${ri % 2 !== 0 ? "bg-muted/[0.03]" : "bg-background"} ${isEditMode ? "cursor-pointer hover:bg-muted/20" : ""}`}
                        style={{ width: dayTimelineWidth }}
                        onClick={() => { if (isEditMode) openAddShift(resource.id, toDateKey(colDates[0])) }}
                      >
                        <div className="absolute inset-0 flex pointer-events-none">
                          {Array.from({ length: timelineHours }, (_, h) => (
                            <div key={h} style={{ width: hourWidth }} className={`h-full border-r ${h % 6 === 0 ? "border-border/45" : "border-border/20"}`} />
                          ))}
                        </div>

                        {rowShifts.map((shift) => {
                          const dayIdx = dateIndexByKey.get(shift.date) ?? 0
                          const left = (dayIdx * 24 + shift.startHour) * hourWidth
                          const width = Math.max((shift.endHour - shift.startHour) * hourWidth, 36)
                          return (
                            <div
                              key={shift.id}
                              className={`absolute top-3 h-8 px-1.5 flex flex-col items-center justify-center text-[11px] font-semibold text-foreground ${isEditMode ? "cursor-pointer hover:underline underline-offset-2" : ""}`}
                              style={{
                                left,
                                width,
                              }}
                              onClick={(e) => { e.stopPropagation(); if (isEditMode) openEditShift(shift) }}
                              title={`${shift.title}: ${formatHour(shift.startHour)} - ${formatHour(shift.endHour)}`}
                            >
                              <span className="truncate text-center">{shift.title}</span>
                              {isEditMode && (
                                <span className="text-[10px] font-medium opacity-70 truncate">{shift.startHour}:00 - {shift.endHour}:00</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Shift Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={shiftDialog.open} onOpenChange={o => !o && setShiftDialog(p => ({ ...p, open: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              {shiftDialog.mode === "add" ? "Add Shift" : "Edit Shift"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-2">
            {/* Resource */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Staff</label>
              <select
                value={shiftForm.resourceId}
                onChange={e => setShiftForm(p => ({ ...p, resourceId: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {resources.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            {/* Date */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</label>
              <Input
                type="date"
                value={shiftForm.date}
                onChange={e => setShiftForm(p => ({ ...p, date: e.target.value }))}
              />
            </div>

            {shiftDialog.mode === "add" ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Route</label>
                  <select
                    value={selectedRouteId}
                    onChange={e => {
                      const rid = e.target.value
                      setSelectedRouteId(rid)
                      const route = routeCards.find((r) => r.id === rid)
                      if (!route) return
                      const autoStyle = normalizeStyle(route.shift)
                      const defaults = getStyleDefaults(autoStyle)
                      setShiftForm(p => ({
                        ...p,
                        title: buildRouteEventTitle(route.name, autoStyle),
                        startHour: defaults.startHour,
                        endHour: defaults.endHour,
                        color: defaults.color,
                      }))
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {routeCards.length === 0 && <option value="">No route available</option>}
                    {routeCards.map(route => (
                      <option key={route.id} value={route.id}>{route.name}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-md border border-border/60 px-3 py-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{addEventPreview || "Select route first"}</p>
                </div>
              </>
            ) : (
              <>
                {/* Title */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shift Name</label>
                  <Input
                    placeholder="e.g. Morning, Afternoon, Night"
                    value={shiftForm.title}
                    onChange={e => setShiftForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>

                {/* Start / End */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start</label>
                    <select
                      value={shiftForm.startHour}
                      onChange={e => setShiftForm(p => ({ ...p, startHour: Number(e.target.value) }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {HOUR_LABELS.map((lbl, i) => (
                        <option key={i} value={i}>{lbl}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">End</label>
                    <select
                      value={shiftForm.endHour}
                      onChange={e => setShiftForm(p => ({ ...p, endHour: Number(e.target.value) }))}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {HOUR_LABELS.map((lbl, i) => (
                        <option key={i + 1} value={i + 1}>{lbl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Color */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {SHIFT_COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => setShiftForm(p => ({ ...p, color: c.value }))}
                        title={c.label}
                        className={`w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-offset-2 transition-all ${
                          shiftForm.color === c.value ? "ring-foreground scale-110" : "ring-transparent hover:ring-border"
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {shiftForm.color === c.value && (
                          <svg className="size-3.5 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="3,8 7,12 13,4" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {shiftDialog.mode === "edit" && shiftDialog.shift && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await deleteShift(shiftDialog.shift!.id)
                    setShiftDialog({ open: false, mode: "add" })
                  }}
                  className="gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Delete Shift
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShiftDialog(p => ({ ...p, open: false }))}>Cancel</Button>
              <Button size="sm" onClick={saveShift}>
                {shiftDialog.mode === "add" ? "Add Shift" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Resource Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={resourceDialog.open} onOpenChange={o => !o && setResourceDialog(p => ({ ...p, open: false }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              {resourceDialog.mode === "add" ? "Add Staff" : "Edit Staff"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</label>
              <Input
                placeholder="e.g. Ahmad Faris"
                value={resForm.name}
                onChange={e => setResForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</label>
              <Input
                placeholder="e.g. Driver, Operator"
                value={resForm.role}
                onChange={e => setResForm(p => ({ ...p, role: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Color</label>
              <div className="flex flex-wrap gap-2">
                {RESOURCE_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setResForm(p => ({ ...p, color: c }))}
                    className={`w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-offset-2 transition-all ${
                      resForm.color === c ? "ring-foreground scale-110" : "ring-transparent hover:ring-border"
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {resForm.color === c && (
                      <svg className="size-3.5 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="3,8 7,12 13,4" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {resourceDialog.mode === "edit" && resourceDialog.resource && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await deleteResource(resourceDialog.resource!.id)
                    setResourceDialog({ open: false, mode: "add" })
                  }}
                  className="gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Delete Staff
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setResourceDialog(p => ({ ...p, open: false }))}>Cancel</Button>
              <Button size="sm" onClick={saveResource}>
                {resourceDialog.mode === "add" ? "Add" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Rooster
