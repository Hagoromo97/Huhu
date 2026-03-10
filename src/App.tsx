import { useState, useEffect, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt"

const RouteList = lazy(() => import("@/components/RouteList").then(m => ({ default: m.RouteList })))
const Calendar = lazy(() => import("@/components/Calendar").then(m => ({ default: m.Calendar })))
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })))
const PlanoVM = lazy(() => import("@/components/PlanoVM").then(m => ({ default: m.PlanoVM })))
const DeliveryTableDialog = lazy(() => import("@/components/DeliveryTableDialog").then(m => ({ default: m.DeliveryTableDialog })))
const Album = lazy(() => import("@/components/Album").then(m => ({ default: m.Album })))
const Rooster = lazy(() => import("@/components/Rooster").then(m => ({ default: m.Rooster })))
const FoodTracker = lazy(() => import("@/components/FoodTracker").then(m => ({ default: m.FoodTracker })))
import { EditModeProvider } from "@/contexts/EditModeContext"
import { DeviceProvider } from "@/contexts/DeviceContext"
import { Toaster } from "sonner"
import { Home, Package, Settings2, Calendar as CalendarIcon, Images, ChevronDown, Truck, Pin, LayoutList, List, ClipboardList, Users, CalendarDays, Clock } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

const STOCK_IN_COLORS  = ["#3B82F6","#F97316","#92400E","#22C55E","#A855F7","#EC4899","#EAB308"]
const MOVE_FRONT_COLORS = ["#EAB308","#3B82F6","#F97316","#92400E","#22C55E","#A855F7","#EC4899"]
const EXPIRED_COLORS   = ["#EC4899","#EAB308","#3B82F6","#F97316","#92400E","#22C55E","#A855F7"]

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/10"
      style={{ backgroundColor: color }}
    />
  )
}

function QuickActionCard({
  icon: Icon,
  label,
  description,
  page,
  iconClass,
  onNavigate,
}: {
  icon: React.ElementType
  label: string
  description: string
  page: string
  iconClass: string
  onNavigate: (page: string) => void
}) {
  return (
    <button
      onClick={() => onNavigate(page)}
      className="group flex h-full flex-col items-start gap-2.5 rounded-xl p-3.5 sm:gap-3 sm:p-4 text-left border border-border/70 bg-card/80 shadow-[0_1px_0_0_hsl(var(--border)/0.45)] hover:bg-muted/50 hover:border-border active:scale-[0.98] transition-all duration-150"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`size-4 shrink-0 ${iconClass}`} />
        <p className="text-sm font-semibold text-foreground tracking-tight leading-snug truncate">{label}</p>
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{description}</p>
    </button>
  )
}

function HomePage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [tableOpen, setTableOpen] = useState(true)
  const [tableExpanded, setTableExpanded] = useState(false)
  // Mon=0 … Sun=6
  const todayIndex = (new Date().getDay() + 6) % 7

  // Read pinned routes from localStorage (written by RouteList)
  const [pinnedRoutes, setPinnedRoutes] = useState<Array<{ id: string; name: string; code: string; shift: string }>>(() => {
    try { return JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]") } catch { return [] }
  })
  // Re-sync when tab becomes visible (user switches from RouteList → Home)
  useEffect(() => {
    const sync = () => {
      try { setPinnedRoutes(JSON.parse(localStorage.getItem("fcalendar_pinned_routes") || "[]")) } catch {}
    }
    window.addEventListener("fcalendar_pins_changed", sync)
    window.addEventListener("focus", sync)
    return () => {
      window.removeEventListener("fcalendar_pins_changed", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])

  return (
    <div className="flex flex-1 flex-col gap-6 p-3.5 sm:p-4 md:gap-7 md:p-8 max-w-3xl mx-auto w-full overflow-y-auto" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
      {/* Welcome */}
      <div className="pt-1 text-center">
        <h1 className="text-[clamp(0.9375rem,3vw,1.125rem)] font-bold text-foreground">Welcome to Data Brutals</h1>
        <p className="text-fluid-sm page-subheader text-muted-foreground mt-1">Daily color guide for stock operations.</p>
      </div>

      {/* Quick Access */}
      <div className="space-y-2.5 sm:space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-0.5">Quick Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
          <QuickActionCard icon={ClipboardList} label="Route List" description="Manage vending routes" page="route-list" iconClass="text-violet-600 dark:text-violet-400" onNavigate={onNavigate} />
          <QuickActionCard icon={Users} label="Rooster" description="Team schedule" page="rooster" iconClass="text-orange-600 dark:text-orange-400" onNavigate={onNavigate} />
          <QuickActionCard icon={LayoutList} label="Plano VM" description="Planogram overview" page="plano-vm" iconClass="text-cyan-600 dark:text-cyan-400" onNavigate={onNavigate} />
        </div>
      </div>

      <div className="mx-0.5 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      {/* Pinned Routes */}
      {pinnedRoutes.length > 0 && (
        <div className="flex flex-col gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <Pin className="size-3" />
            Pinned Routes
          </div>
          <div className="rounded-xl ring-1 ring-border/60 overflow-hidden bg-card">
            {pinnedRoutes.map((r, i) => {
              const isKL  = (r.name + " " + r.code).toLowerCase().includes("kl")
              const isSel = (r.name + " " + r.code).toLowerCase().includes("sel")
              return (
                <div key={r.id} className={`flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3 ${i !== 0 ? "border-t border-border/40" : ""}`}>
                  {/* Flag / icon */}
                  {isKL
                    ? <img src="/kl-flag.png" className="shrink-0 object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 32, height: 20 }} alt="KL" />
                    : isSel
                    ? <img src="/selangor-flag.png" className="shrink-0 object-cover rounded shadow-sm ring-1 ring-black/10 dark:ring-white/10" style={{ width: 32, height: 20 }} alt="Selangor" />
                    : <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                        <Truck className="size-3.5 text-primary" />
                      </div>
                  }
                  {/* Name */}
                  <p className="flex-1 text-xs font-semibold text-foreground leading-tight line-clamp-1 min-w-0">{r.name}</p>
                  {/* Code */}
                  <span className="shrink-0 text-[10px] font-mono text-muted-foreground">{r.code}</span>
                  {/* Shift badge */}
                  <span className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full text-white tracking-wide ${
                    r.shift === 'AM' ? 'bg-blue-500' : r.shift === 'PM' ? 'bg-orange-600' : 'bg-muted text-muted-foreground'
                  }`}>{r.shift || '—'}</span>
                  {/* View button */}
                  <button
                    className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Open route table"
                    onClick={() => {
                      sessionStorage.setItem('fcalendar_open_route', r.id)
                      onNavigate('route-list')
                    }}
                  >
                    <List className="size-3" />
                    View
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Color Guide Table */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-3 px-0.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Daily Color</p>
          <div className="h-px flex-1 bg-border/50" />
        </div>
      <div className="rounded-2xl border border-border/70 overflow-hidden bg-card shadow-[0_1px_0_0_hsl(var(--border)/0.45)]">
        {/* Collapsible header */}
        <button
          className="w-full grid grid-cols-4 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-foreground/85 px-3 py-2.5 gap-1.5 sm:px-4 sm:py-3 sm:gap-2 hover:bg-muted/65 transition-colors text-left items-center"
          onClick={() => setTableOpen(v => !v)}
        >
          <span className="flex items-center gap-1.5">
            <ChevronDown className={`size-3.5 shrink-0 transition-transform duration-200 ${tableOpen ? "rotate-180" : ""}`} />
            Day
          </span>
          <span className="text-center">✅ Stock In</span>
          <span className="text-center">🔄 Move Front</span>
          <span className="text-center">🚫 Expired</span>
        </button>
        {/* Rows — today always visible, others shown when expanded */}
        {tableOpen && DAYS.map((day, i) => {
          const isToday = i === todayIndex
          if (!isToday && !tableExpanded) return null
          return (
          <div
            key={day}
            className={`grid grid-cols-4 items-center px-3 py-2.5 gap-1.5 sm:px-4 sm:py-3 sm:gap-2 border-t border-border/60 transition-colors ${isToday ? "bg-primary/[0.06] hover:bg-primary/[0.09]" : "hover:bg-muted/20"}`}
          >
            <div className="flex items-center gap-2">
              {isToday && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              <p className={`text-sm font-semibold ${isToday ? "text-foreground" : "text-foreground"}`}>{day}</p>
            </div>
            <div className="flex justify-center">
              <ColorDot color={STOCK_IN_COLORS[i]} />
            </div>
            <div className="flex justify-center">
              <ColorDot color={MOVE_FRONT_COLORS[i]} />
            </div>
            <div className="flex justify-center">
              <ColorDot color={EXPIRED_COLORS[i]} />
            </div>
          </div>
          )
        })}
        {tableOpen && (
          <button
            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border/60"
            onClick={() => setTableExpanded(v => !v)}
          >
            <ChevronDown className={`size-3 transition-transform duration-200 ${tableExpanded ? "rotate-180" : ""}`} />
            {tableExpanded ? "Show less" : "Show all days"}
          </button>
        )}
        {tableOpen && (
          <div className="border-t border-border/60 p-3.5 sm:p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Color Expired</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
              {[
                { color: "#3B82F6", label: "Blue" },
                { color: "#F97316", label: "Orange" },
                { color: "#92400E", label: "Brown" },
                { color: "#22C55E", label: "Green" },
                { color: "#A855F7", label: "Purple" },
                { color: "#EC4899", label: "Pink" },
                { color: "#EAB308", label: "Yellow" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ColorDot color={color} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState("home")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [roosterViewMode, setRoosterViewMode] = useState<"week" | "day">("week")
  const { open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar } = useSidebar()

  const handlePageChange = (page: string) => {
    // Always close sidebar after selecting a destination.
    if (isMobile) setOpenMobile(false)
    else setOpen(false)

    if (page === currentPage) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentPage(page)
      setIsTransitioning(false)
    }, 300)
  }

  const renderContent = () => {
    switch (currentPage) {
      case "route-list":
        return <RouteList />
      case "deliveries":
        return (
          <div className="flex flex-col flex-1 min-h-0 gap-4 p-4 md:p-6">
            <div className="shrink-0">
              <h1 className="text-fluid-xl page-header font-bold text-foreground">Location</h1>
              <p className="text-fluid-sm page-subheader text-muted-foreground mt-1">View and manage delivery records.</p>
            </div>
            <DeliveryTableDialog />
          </div>
        )
      case "calendar-month":
        return <Calendar view="month" />
      case "calendar-week":
        return <Calendar view="week" />
      case "calendar-day":
        return <Calendar view="day" />
      case "calendar-list":
        return <Calendar view="list" />
      case "calendar":
        return <Calendar view="month" />
      case "rooster":
        return <Rooster viewMode={roosterViewMode} />
      case "food-tracker":
        return <FoodTracker />
      case "settings":
      case "settings-profile":
        return <Settings section="profile" />
      case "settings-mode":
        return <Settings section="mode" />
      case "settings-edit-mode":
        return <Settings section="edit-mode" />
      case "settings-notifications":
        return <Settings section="notifications" />
      case "settings-appearance":
        return <Settings section="appearance-theme" />
      case "settings-appearance-font":
        return <Settings section="appearance-font" />
      case "settings-appearance-display":
        return <Settings section="appearance-display" />
      case "settings-security":
        return <Settings section="security" />
      case "plano-vm":
        return <PlanoVM />
      case "gallery-album":
        return <Album />
      case "home":
      default:
        return <HomePage onNavigate={handlePageChange} />
    }
  }

  const getPageBreadcrumbs = (): { parent?: { label: string; icon: React.ElementType }; current: string } => {
    switch (currentPage) {
      case "route-list":
        return { parent: { label: "Vending Machine", icon: Package }, current: "Route List" }
      case "deliveries":
        return { parent: { label: "Vending Machine", icon: Package }, current: "Location" }
      case "calendar-month":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Month View" }
      case "calendar-week":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Week View" }
      case "calendar-day":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Day View" }
      case "calendar-list":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "List View" }
      case "calendar":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Month View" }
      case "rooster":
        return { parent: { label: "Calendar", icon: CalendarIcon }, current: "Rooster" }
      case "food-tracker":
        return { parent: { label: "Food Tracker", icon: Package }, current: "Tracker" }
      case "settings":
      case "settings-profile":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Profile" }
      case "settings-mode":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Mode" }
      case "settings-edit-mode":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Edit Mode" }
      case "settings-notifications":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Notifications" }
      case "settings-appearance":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Appearance" }
      case "settings-appearance-font":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Font" }
      case "settings-appearance-display":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Display" }
      case "settings-security":
        return { parent: { label: "Settings", icon: Settings2 }, current: "Security" }
      case "plano-vm":
        return { parent: { label: "Gallery", icon: Images }, current: "Plano VM" }
      case "gallery-album":
        return { parent: { label: "Gallery", icon: Images }, current: "Album" }
      case "home":
      default:
        return { current: "Home" }
    }
  }

  return (
    <>
      <AppSidebar onNavigate={handlePageChange} currentPage={currentPage} />
      
      {/* Backdrop for desktop sidebar */}
      {!isMobile && open && (
        <div 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}
      
      <main className={`relative flex w-full flex-1 flex-col min-h-0 overflow-hidden bg-background transition-all duration-500 ease-in-out ${(isMobile && openMobile) || (!isMobile && open) ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <header className="glass-header sticky top-0 z-30 flex shrink-0 items-center gap-2 px-3 md:px-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-colors duration-300" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)', paddingBottom: '0.625rem', minHeight: 'calc(3.5rem + max(env(safe-area-inset-top), 12px))' }}>
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator orientation="vertical" className="mr-1 md:mr-2 h-4 shrink-0" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem className="shrink-0">
                <BreadcrumbLink
                  href="#"
                  onClick={() => handlePageChange("home")}
                  className="flex items-center gap-1.5 font-semibold text-foreground hover:text-foreground/80 transition-colors"
                >
                  <Home className="size-4 shrink-0" />
                </BreadcrumbLink>
              </BreadcrumbItem>
              {(() => {
                const { parent, current } = getPageBreadcrumbs()
                return (
                  <>
                    {parent && (
                      <>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem
                          key={`parent-${currentPage}`}
                          className="hidden md:flex items-center gap-1 text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-200"
                        >
                          <parent.icon className="size-3.5 shrink-0" />
                          <span>{parent.label}</span>
                        </BreadcrumbItem>
                      </>
                    )}
                    <BreadcrumbSeparator className={parent ? undefined : "hidden md:block"} />
                    <BreadcrumbItem
                      key={`current-${currentPage}`}
                      className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      <BreadcrumbPage className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-none font-medium">
                        {current}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )
              })()}
            </BreadcrumbList>
          </Breadcrumb>

          {currentPage === "rooster" && (
            <button
              onClick={() => setRoosterViewMode((prev) => (prev === "week" ? "day" : "week"))}
              className="flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 text-xs font-semibold text-foreground transition-all duration-150 shadow-sm"
              aria-label="Toggle rooster view mode"
            >
              {roosterViewMode === "week" ? (
                <>
                  <CalendarDays className="size-3 shrink-0" />
                  Week
                </>
              ) : (
                <>
                  <Clock className="size-3 shrink-0" />
                  Day
                </>
              )}
            </button>
          )}

          {/* Calendar view cycle button — single multi-state button */}
          {["calendar","calendar-month","calendar-week","calendar-day","calendar-list"].includes(currentPage) && (() => {
            const VIEWS = ["calendar-month", "calendar-week", "calendar-day", "calendar-list"] as const
            const LABELS: Record<string, string> = {
              "calendar-month": "Month",
              "calendar-week":  "Week",
              "calendar-day":   "Day",
              "calendar-list":  "List",
            }
            const active = currentPage === "calendar" ? "calendar-month" : currentPage
            const currentIdx = VIEWS.indexOf(active as typeof VIEWS[number])
            const nextView = VIEWS[(currentIdx + 1) % VIEWS.length]
            return (
              <button
                onClick={() => handlePageChange(nextView)}
                className="flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 text-xs font-semibold text-foreground transition-all duration-150 shadow-sm"
              >
                {active === "calendar-list" && <LayoutList className="size-3 shrink-0" />}
                {LABELS[active]}
                <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
              </button>
            )
          })()}

        </header>
        <Suspense fallback={<div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">Loading…</div>}>
          <div className={`flex flex-col flex-1 min-h-0 ${isTransitioning ? "page-fade-out" : "page-fade-in animate-in slide-in-from-bottom-4"}`}>
            {renderContent()}
          </div>
        </Suspense>
      </main>

      {/* Edit Mode controls moved to Settings page */}
    </>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-semibold">Ralat berlaku</h1>
          <pre className="max-w-xl rounded bg-muted p-4 text-left text-xs text-destructive overflow-auto">
            {this.state.error.message}
          </pre>
          <button
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  return (
    <DeviceProvider>
      <ErrorBoundary>
        <SidebarProvider defaultOpen={false}>
          <EditModeProvider>
            <AppContent />
          </EditModeProvider>
        </SidebarProvider>
        <PWAInstallPrompt />
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast:
                "!border !border-border !bg-background !text-foreground !shadow-xl !rounded-xl",
              title: "!text-foreground !font-semibold !text-sm",
              description: "!text-muted-foreground !text-xs",
              success:
                "!border-green-500/50 [&_[data-icon]]:!text-green-500 [&_[data-icon]_svg]:!stroke-green-500 [&_[data-icon]_svg]:!text-green-500",
              error:
                "!border-red-500/50 [&_[data-icon]]:!text-red-500 [&_[data-icon]_svg]:!stroke-red-500 [&_[data-icon]_svg]:!text-red-500",
              warning:
                "!border-amber-400/50 [&_[data-icon]]:!text-amber-500 [&_[data-icon]_svg]:!stroke-amber-500 [&_[data-icon]_svg]:!text-amber-500",
              info:
                "!border-sky-400/50 [&_[data-icon]]:!text-sky-500 [&_[data-icon]_svg]:!stroke-sky-500 [&_[data-icon]_svg]:!text-sky-500",
              loader:
                "!border-primary/40 [&_[data-icon]]:!text-primary",
            },
          }}
        />
      </ErrorBoundary>
    </DeviceProvider>
  )
}

export default App
