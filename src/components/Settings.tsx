import { useState } from "react"
import type { ReactNode } from "react"
import {
  User, Bell, Lock, Globe, Mail, Phone, Save, Shield,
  Eye, EyeOff, Sun, Check, Type, ZoomIn,
  Pencil,
  Brush, AlertTriangle, Languages,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { useTheme, FONT_OPTIONS, type ColorTheme, type AppFont, type AppZoom, type TextSize } from "@/hooks/use-theme"
import { useEditMode } from "@/contexts/EditModeContext"

// ─── Types ────────────────────────────────────────────────────────────────────
type ThemeOption = {
  id: ColorTheme
  label: string
  lightPreview: { bg: string; primary: string; text: string }
  darkPreview: { bg: string; primary: string; text: string }
}

type SectionId =
  | "profile"
  | "mode"
  | "edit-mode"
  | "notifications"
  | "appearance-theme"
  | "appearance-font"
  | "appearance-display"
  | "appearance-language"
  | "security"
  | "danger"

// ─── Constants ────────────────────────────────────────────────────────────────
const THEME_OPTIONS: ThemeOption[] = [
  { id: "default",        label: "Default",        lightPreview: { bg: "#f0f7ff", primary: "#0ea5e9", text: "#0f1f2b" }, darkPreview: { bg: "#0d1a22", primary: "#0ea5e9", text: "#e8f4fb" } },
  { id: "bubblegum",      label: "Bubble Gum",     lightPreview: { bg: "#f5d6e4", primary: "#d4487a", text: "#4a2030" }, darkPreview: { bg: "#1e2e3a", primary: "#f5d87c", text: "#f0d0e0" } },
  { id: "candyland",      label: "Candy Land",     lightPreview: { bg: "#fde8ef", primary: "#e03050", text: "#2a1535" }, darkPreview: { bg: "#1e1635", primary: "#f5d070", text: "#f5e8c0" } },
  { id: "claude",         label: "Claude",         lightPreview: { bg: "#faf6ef", primary: "#d46b32", text: "#2a1a0e" }, darkPreview: { bg: "#1f1610", primary: "#e07840", text: "#f0e8d8" } },
  { id: "cyberpunk",      label: "Cyberpunk",      lightPreview: { bg: "#eef2f8", primary: "#00c8e0", text: "#0a1020" }, darkPreview: { bg: "#0a0c18", primary: "#e8e030", text: "#c0f0f8" } },
  { id: "northern-lights",label: "Northern Lights",lightPreview: { bg: "#eef5f5", primary: "#2a9d7f", text: "#102028" }, darkPreview: { bg: "#0a1020", primary: "#40d8a8", text: "#c0f0e8" } },
  { id: "ocean-breeze",   label: "Ocean Breeze",   lightPreview: { bg: "#e8f4f8", primary: "#1a6ea0", text: "#0a1820" }, darkPreview: { bg: "#0c1620", primary: "#30b8d8", text: "#b8e8f5" } },
]

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
// ─── Section panels ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <Separator className="mt-4" />
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function Settings({ section = "profile" }: { section?: SectionId }) {
  const { mode, setMode, colorTheme, setColorTheme, appFont, setAppFont, appZoom, setAppZoom, textSize, setTextSize } = useTheme()
  const { isEditMode, setIsEditMode, hasUnsavedChanges, saveChanges, discardChanges, isSaving } = useEditMode()
  const active = section

  // Profile state
  const [profile, setProfile] = useState({ name: "John Doe", email: "john.doe@speedparcel.com", phone: "+60 12-345 6789", role: "Delivery Manager" })

  // Notifications state
  const [notifications, setNotifications] = useState({ email: true, push: true, sms: false, weeklyReport: true })

  // Appearance language/tz state
  const [language, setLanguage] = useState("en")
  const [timezone, setTimezone] = useState("Asia/Kuala_Lumpur")

  // Security state
  const [security, setSecurity] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false)

  // Card columns
  const [cardCols, setCardCols] = useState(() => localStorage.getItem('fcalendar_card_cols') || '2')
  const updateCardCols = (v: string) => {
    localStorage.setItem('fcalendar_card_cols', v)
    setCardCols(v)
    window.dispatchEvent(new Event('fcalendar_card_cols_changed'))
  }

  const handleChangePassword = () => {
    if (security.newPassword !== security.confirmPassword) { alert("New passwords do not match!"); return }
    if (security.newPassword.length < 8) { alert("Password must be at least 8 characters!"); return }
    alert("Password changed successfully!")
    setSecurity({ currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  const handleEditModeSwitch = (checked: boolean) => {
    if (checked) {
      setIsEditMode(true)
      return
    }
    if (hasUnsavedChanges) {
      setUnsavedDialogOpen(true)
      return
    }
    setIsEditMode(false)
  }

  // ── Render section content ────────────────────────────────────────────────
  const renderContent = () => {
    switch (active) {

      // ── Profile ───────────────────────────────────────────────────────────
      case "profile":
        return (
          <div>
            <SectionHeader icon={<User className="size-5" />} title="Profile" description="Maklumat akaun anda." />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Enter your name" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Input value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} placeholder="Your role" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Mail className="size-4" />Email Address</label>
                  <Input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="your.email@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Phone className="size-4" />Phone Number</label>
                  <Input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+60 12-345 6789" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => alert("Profile settings saved!")}><Save className="size-4 mr-2" />Save Profile</Button>
              </div>
            </div>
          </div>
        )

      // ── Notifications ─────────────────────────────────────────────────────
      case "notifications":{
        const NOTIF_ITEMS: { key: keyof typeof notifications; label: string; desc: string; icon: ReactNode }[] = [
          { key: "email",        label: "Email Notifications",  desc: "Receive notifications via email",                   icon: <Mail className="size-4 text-muted-foreground" /> },
          { key: "push",         label: "Push Notifications",   desc: "Receive push notifications on your device",          icon: <Bell className="size-4 text-muted-foreground" /> },
          { key: "sms",          label: "SMS Notifications",    desc: "Receive important alerts via SMS",                   icon: <Phone className="size-4 text-muted-foreground" /> },
          { key: "weeklyReport", label: "Weekly Report",        desc: "Receive weekly delivery summary report",             icon: <Globe className="size-4 text-muted-foreground" /> },
        ]
        return (
          <div>
            <SectionHeader icon={<Bell className="size-5" />} title="Notifications" description="Manage the notifications you receive." />

            <FieldGroup className="w-full">
              {NOTIF_ITEMS.map(({ key, label, desc, icon }) => (
                <Field key={key} orientation="horizontal"
                  className="justify-between rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm hover:bg-accent/30 transition-colors"
                >
                  {/* Left: icon + text */}
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 rounded-md bg-muted p-1.5">{icon}</span>
                    <div className="min-w-0">
                      <FieldLabel htmlFor={`notif-${key}`} className="text-sm font-medium leading-tight block truncate">
                        {label}
                      </FieldLabel>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{desc}</p>
                    </div>
                  </div>
                  {/* Right: switch */}
                  <Switch
                    id={`notif-${key}`}
                    size="default"
                    checked={notifications[key]}
                    onCheckedChange={v => setNotifications(n => ({ ...n, [key]: v }))}
                    className="shrink-0 ml-4"
                  />
                </Field>
              ))}
            </FieldGroup>

            <div className="flex justify-end mt-5">
              <Button onClick={() => alert("Notification settings saved!")}>
                <Save className="size-4 mr-2" />Save Notifications
              </Button>
            </div>
          </div>
        )
      }

      // ── Mode ──────────────────────────────────────────────────────────────
      case "mode":
        return (
          <div>
            <SectionHeader icon={<Sun className="size-5" />} title="Mode" description="Switch between light and dark mode." />
            <div className="space-y-4">
              <Field orientation="horizontal" className="justify-between rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
                <div className="min-w-0">
                  <FieldLabel htmlFor="settings-dark-mode" className="text-sm font-medium leading-tight block">
                    Dark Mode
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    Toggle ON for dark mode, OFF for light mode.
                  </p>
                </div>
                <Switch
                  id="settings-dark-mode"
                  size="default"
                  checked={mode === "dark"}
                  onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
                  className="shrink-0 ml-4"
                />
              </Field>
            </div>
          </div>
        )

      // ── Edit Mode ─────────────────────────────────────────────────────────
      case "edit-mode":
        return (
          <div>
            <SectionHeader icon={<Pencil className="size-5" />} title="Edit Mode" description="Enable editing features for calendar, routes, and roster." />
            <div className="space-y-4">
              <Field orientation="horizontal" className="justify-between rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
                <div className="min-w-0">
                  <FieldLabel htmlFor="settings-edit-mode" className="text-sm font-medium leading-tight block">
                    Edit Mode
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                    Turn on to add, edit, or delete data.
                  </p>
                </div>
                <Switch
                  id="settings-edit-mode"
                  size="default"
                  checked={isEditMode}
                  onCheckedChange={handleEditModeSwitch}
                  className="shrink-0 ml-4"
                />
              </Field>

              {hasUnsavedChanges && (
                <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3">
                  <p className="text-xs font-medium text-foreground">Unsaved changes detected.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={async () => { await saveChanges() }} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={discardChanges}>Discard Changes</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      // ── Appearance: Theme & Mode ──────────────────────────────────────────
      case "appearance-theme":
        return (
          <div>
            <SectionHeader icon={<Brush className="size-5" />} title="Appearance" description="Choose your app colour theme." />
            <div className="space-y-3">
              <div className="space-y-3">
                <label className="text-sm font-medium">Color Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {THEME_OPTIONS.map(opt => {
                    const preview = mode === "dark" ? opt.darkPreview : opt.lightPreview
                    const isActive = colorTheme === opt.id
                    return (
                      <button key={opt.id} onClick={() => setColorTheme(opt.id)} style={{ backgroundColor: preview.bg }}
                        className={`relative rounded-lg border-2 p-3 text-left transition-all hover:scale-105 ${isActive ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"}`}
                      >
                        <div className="flex gap-1 mb-2">
                          <span className="h-3 w-6 rounded-sm" style={{ backgroundColor: preview.primary }} />
                          <span className="h-3 w-6 rounded-sm opacity-50" style={{ backgroundColor: preview.text }} />
                        </div>
                        <p className="text-xs font-semibold truncate" style={{ color: preview.text }}>{opt.label}</p>
                        {isActive && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-2.5" /></span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )

      // ── Appearance: Font ──────────────────────────────────────────────────
      case "appearance-font":
        return (
          <div>
            <SectionHeader icon={<Type className="size-5" />} title="Font Style" description="Choose a font for the entire app." />
            <div className="space-y-6">
              <div className="rounded-xl border border-border/70 bg-card/70 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Pick Your Typeface</p>
                <p className="mt-1 text-sm text-muted-foreground">Tap any card to apply instantly across the app.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {FONT_OPTIONS.map(opt => {
                  const isActive = appFont === opt.id
                  return (
                    <button key={opt.id} onClick={() => setAppFont(opt.id as AppFont)}
                      className={`group relative flex min-h-[150px] flex-col justify-between gap-3 overflow-hidden rounded-xl border-2 px-4 py-4 text-left transition-all duration-200 ${
                        isActive
                          ? "border-primary bg-primary/[0.08] ring-2 ring-primary/25 shadow-sm"
                          : "border-border/80 bg-card hover:border-primary/45 hover:bg-accent/20"
                      }`}
                    >
                      <span className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-90" />
                      <div className="space-y-1.5">
                        <p className="text-base font-semibold leading-tight" style={{ fontFamily: opt.family }}>{opt.label}</p>
                        <p className="text-xs text-muted-foreground">Aa Bb Cc 123</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-3xl leading-none" style={{ fontFamily: opt.family }}>Aa</p>
                        <p className="text-xs text-muted-foreground/80 truncate" style={{ fontFamily: opt.family }}>Sphinx of black quartz, judge my vow.</p>
                      </div>
                      {isActive && <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
                    </button>
                  )
                })}
              </div>

              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-muted/30 via-card to-muted/10 p-5 sm:p-6 space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-[0.16em] font-semibold">Live Preview</p>
                <p className="text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed" style={{ fontFamily: FONT_OPTIONS.find(f => f.id === appFont)?.family }}>
                  This is a text preview using <strong>{FONT_OPTIONS.find(f => f.id === appFont)?.label}</strong>. The quick brown fox jumps over the lazy dog.
                </p>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: FONT_OPTIONS.find(f => f.id === appFont)?.family }}>
                  0123456789 . , : ; ! ? @ # & ( )
                </p>
              </div>
            </div>
          </div>
        )

      case "appearance-display":
        return (
          <div>
            <SectionHeader icon={<ZoomIn className="size-5" />} title="Display" description="UI scale, text size and card layout." />
            <div className="space-y-8">

              {/* App Zoom */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">App Zoom</label>
                    <p className="text-xs text-muted-foreground mt-0.5">Overall application display scale.</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md min-w-[3.5rem] text-center">{appZoom}%</span>
                </div>
                {/* Slider */}
                <input
                  type="range" min="80" max="120" step="5"
                  value={appZoom}
                  onChange={e => setAppZoom(e.target.value as AppZoom)}
                  className="w-full accent-primary h-2 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/60">
                  <span>80%</span><span>90%</span><span>100%</span><span>110%</span><span>120%</span>
                </div>
                {/* Quick presets */}
                <div className="flex gap-1.5 flex-wrap">
                  {(["80","90","95","100","105","110","120"] as AppZoom[]).map(z => (
                    <button key={z} onClick={() => setAppZoom(z)}
                      className={`flex-1 min-w-[3rem] py-1.5 rounded-md border text-xs font-semibold transition-all ${appZoom === z ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
                    >{z}%</button>
                  ))}
                </div>
                {/* Zoom indicator */}
                <div className="p-3 rounded-lg bg-muted/40 border flex items-center gap-3">
                  <div className="relative flex items-end gap-1 h-8">
                    {(["80","90","100","110","120"] as AppZoom[]).map(z => (
                      <div key={z}
                        className={`rounded-sm transition-all duration-200 ${appZoom === z ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                        style={{ width: 8, height: `${(parseInt(z) - 70) / 50 * 100}%`, minHeight: 4 }}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{parseInt(appZoom) < 100 ? 'Zoomed out' : parseInt(appZoom) > 100 ? 'Zoomed in' : 'Default size'}</p>
                    <p className="text-[10px] text-muted-foreground">Changes apply instantly to the whole app</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Text Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Text Size</label>
                    <p className="text-xs text-muted-foreground mt-0.5">Affects all text in the application.</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">{textSize}px</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {([
                    { v: "13", label: "XS" }, { v: "14", label: "S" }, { v: "15", label: "M−" },
                    { v: "16", label: "M" },  { v: "17", label: "M+" }, { v: "18", label: "L" }, { v: "20", label: "XL" },
                  ] as { v: TextSize; label: string }[]).map(({ v, label }) => (
                    <button key={v} onClick={() => setTextSize(v)}
                      className={`flex-1 min-w-[3rem] flex flex-col items-center py-2 px-1 rounded-md border transition-all ${textSize === v ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"}`}
                    >
                      <span className="font-semibold text-xs">{label}</span>
                      <span className="text-[10px] opacity-70">{v}px</span>
                    </button>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-muted/40 border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Size Preview</p>
                  <p style={{ fontSize: `${textSize}px` }}>Current text size ({textSize}px) — The quick brown fox.</p>
                </div>
              </div>

              <Separator />

              {/* Card Columns */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Route Card Columns</label>
                  <p className="text-xs text-muted-foreground mt-0.5">Number of cards per row on Route List page.</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { v: '2', label: '2', desc: 'Large cards' },
                    { v: '3', label: '3', desc: 'Medium cards' },
                    { v: '4', label: '4', desc: 'Small cards' },
                    { v: 'auto', label: 'Auto', desc: 'Responsive' },
                  ].map(o => (
                    <button key={o.v} onClick={() => updateCardCols(o.v)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                        cardCols === o.v ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`grid gap-0.5 w-full ${
                        o.v === '2' ? 'grid-cols-2' : o.v === '3' ? 'grid-cols-3' : 'grid-cols-4'
                      }`}>
                        {Array.from({ length: o.v === 'auto' ? 4 : parseInt(o.v) }).map((_, i) => (
                          <div key={i} className={`h-2.5 rounded-sm ${
                            cardCols === o.v ? 'bg-primary-foreground/40' : 'bg-muted-foreground/20'
                          }`} />
                        ))}
                      </div>
                      <span className="text-xs font-bold">{o.label}</span>
                      <span className="text-[9px] opacity-70 text-center leading-tight">{o.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )

      // ── Appearance: Language ──────────────────────────────────────────────
      case "appearance-language":
        return (
          <div>
            <SectionHeader icon={<Languages className="size-5" />} title="Language & Timezone" description="Display language and timezone settings." />
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2"><Globe className="size-4" />Language</label>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="en">English</option>
                    <option value="ms">Bahasa Melayu</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timezone</label>
                  <select value={timezone} onChange={e => setTimezone(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Asia/Kuala_Lumpur">Kuala Lumpur (GMT+8)</option>
                    <option value="Asia/Singapore">Singapore (GMT+8)</option>
                    <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
                    <option value="Asia/Jakarta">Jakarta (GMT+7)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => alert("Appearance settings saved!")}><Save className="size-4 mr-2" />Save</Button>
              </div>
            </div>
          </div>
        )

      // ── Security ──────────────────────────────────────────────────────────
      case "security":
        return (
          <div>
            <SectionHeader icon={<Lock className="size-5" />} title="Security" description="Tukar kata laluan akaun anda." />
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Shield className="size-4" />Current Password</label>
                <div className="relative">
                  <Input type={showPasswords.current ? "text" : "password"} value={security.currentPassword} onChange={e => setSecurity({ ...security, currentPassword: e.target.value })} placeholder="Enter current password" className="pr-10" />
                  <button onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPasswords.current ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Input type={showPasswords.new ? "text" : "password"} value={security.newPassword} onChange={e => setSecurity({ ...security, newPassword: e.target.value })} placeholder="Enter new password" className="pr-10" />
                    <button onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPasswords.new ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <div className="relative">
                    <Input type={showPasswords.confirm ? "text" : "password"} value={security.confirmPassword} onChange={e => setSecurity({ ...security, confirmPassword: e.target.value })} placeholder="Confirm new password" className="pr-10" />
                    <button onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPasswords.confirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-muted/50 rounded-md p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-medium">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>At least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character</li>
                </ul>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={!security.currentPassword || !security.newPassword || !security.confirmPassword}>
                  <Lock className="size-4 mr-2" />Change Password
                </Button>
              </div>
            </div>
          </div>
        )

      // ── Danger Zone ───────────────────────────────────────────────────────
      case "danger":
        return (
          <div>
            <SectionHeader icon={<AlertTriangle className="size-5 text-destructive" />} title="Danger Zone" description="Actions that cannot be undone." />
            <div className="bg-destructive/10 rounded-lg border border-destructive/50 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                </div>
                <Button variant="destructive" onClick={() => { if (confirm("Are you sure? This cannot be undone.")) alert("Account deletion requested. Please contact administrator.") }}>
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto p-4 md:p-6 max-w-3xl w-full mx-auto" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>
      {renderContent()}

      <Dialog open={unsavedDialogOpen} onOpenChange={setUnsavedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. What would you like to do before turning off Edit Mode?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                discardChanges()
                setUnsavedDialogOpen(false)
                setIsEditMode(false)
              }}
            >
              Discard Changes
            </Button>
            <Button
              onClick={async () => {
                await saveChanges()
                setUnsavedDialogOpen(false)
                setIsEditMode(false)
              }}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save & Turn Off"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

