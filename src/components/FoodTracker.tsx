import { useMemo, useState } from "react"
import { Calendar, Clock3, Edit3, List, PackageOpen, Plus, Sparkles, Trash2, Undo2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type FoodItem = {
  id: string
  name: string
  category: string
  expiryDate: string
  notes?: string
  createdAt: string
  deletedAt?: string
}

type TrackerNotice = {
  id: string
  message: string
  type: "success" | "warning" | "info"
}

const STORAGE_ACTIVE = "fcalendar_foodtracker_active"
const STORAGE_TRASH = "fcalendar_foodtracker_trash"

const CATEGORIES = ["None", "Dairy", "Meat", "Vegetables", "Fruits", "Bakery", "Pantry", "Frozen"]

const CATEGORY_STYLES: Record<string, string> = {
  None: "bg-muted text-muted-foreground",
  Dairy: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  Meat: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  Vegetables: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Fruits: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  Bakery: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Pantry: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  Frozen: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
}

function getCountdownMeta(days: number): { label: string; className: string } {
  if (days < 0) {
    return {
      label: "Expired",
      className: "bg-destructive/15 text-destructive border border-destructive/30 animate-pulse",
    }
  }
  if (days <= 3) {
    return {
      label: `${days}d left`,
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse",
    }
  }
  if (days <= 7) {
    return {
      label: `${days}d left`,
      className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30",
    }
  }
  return {
    label: `${days}d left`,
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
  }
}

function readList(key: string): FoodItem[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function daysUntil(expiryDate: string) {
  const now = new Date()
  const target = new Date(expiryDate)
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function monthLabel(isoDate: string) {
  const d = new Date(isoDate)
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function prettyDate(isoDate: string) {
  const d = new Date(isoDate)
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })
}

export function FoodTracker() {
  const [items, setItems] = useState<FoodItem[]>(() => readList(STORAGE_ACTIVE))
  const [trash, setTrash] = useState<FoodItem[]>(() => readList(STORAGE_TRASH))
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FoodItem | null>(null)
  const [notices, setNotices] = useState<TrackerNotice[]>([])
  const [form, setForm] = useState({
    name: "",
    category: "None",
    expiryDate: new Date().toISOString().slice(0, 10),
    notes: "",
  })

  const persist = (nextItems: FoodItem[], nextTrash = trash) => {
    setItems(nextItems)
    setTrash(nextTrash)
    localStorage.setItem(STORAGE_ACTIVE, JSON.stringify(nextItems))
    localStorage.setItem(STORAGE_TRASH, JSON.stringify(nextTrash))
  }

  const pushNotice = (message: string, type: TrackerNotice["type"]) => {
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    setNotices((prev) => [{ id, message, type }, ...prev].slice(0, 4))
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((n) => n.id !== id))
    }, 2400)
  }

  const grouped = useMemo(() => {
    const map = new Map<string, FoodItem[]>()
    ;[...items]
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      .forEach((item) => {
        const key = monthLabel(item.expiryDate)
        map.set(key, [...(map.get(key) ?? []), item])
      })
    return Array.from(map.entries())
  }, [items])

  const expiringSoon = useMemo(() => items.filter((i) => {
    const d = daysUntil(i.expiryDate)
    return d >= 0 && d <= 7
  }).length, [items])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: "", category: "None", expiryDate: new Date().toISOString().slice(0, 10), notes: "" })
    setDialogOpen(true)
  }

  const openEdit = (item: FoodItem) => {
    setEditing(item)
    setForm({ name: item.name, category: item.category, expiryDate: item.expiryDate, notes: item.notes ?? "" })
    setDialogOpen(true)
  }

  const saveItem = () => {
    if (!form.name.trim()) {
      toast.error("Please enter item name")
      return
    }

    if (editing) {
      const next = items.map((i) => i.id === editing.id ? { ...editing, ...form } : i)
      persist(next)
      pushNotice("Item updated successfully", "success")
    } else {
      const next: FoodItem[] = [
        ...items,
        {
          id: `food_${Date.now()}`,
          name: form.name.trim(),
          category: form.category,
          expiryDate: form.expiryDate,
          notes: form.notes.trim(),
          createdAt: new Date().toISOString(),
        },
      ]
      persist(next)
      pushNotice("Item added successfully", "success")
    }

    setDialogOpen(false)
  }

  const moveToTrash = (id: string) => {
    const target = items.find((i) => i.id === id)
    if (!target) return
    const nextItems = items.filter((i) => i.id !== id)
    const nextTrash = [{ ...target, deletedAt: new Date().toISOString() }, ...trash]
    persist(nextItems, nextTrash)
    pushNotice("Item moved to trash", "info")
  }

  const restoreItem = (id: string) => {
    const target = trash.find((i) => i.id === id)
    if (!target) return
    const nextTrash = trash.filter((i) => i.id !== id)
    const nextItems = [{ ...target, deletedAt: undefined }, ...items]
    persist(nextItems, nextTrash)
    pushNotice("Item restored", "success")
  }

  const permanentDelete = (id: string) => {
    const nextTrash = trash.filter((i) => i.id !== id)
    persist(items, nextTrash)
    pushNotice("Item deleted permanently", "warning")
  }

  const clearTrash = () => {
    persist(items, [])
    pushNotice("Trash cleared", "warning")
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col flex-1 min-h-0 p-4 md:p-6 gap-4 overflow-y-auto animate-in fade-in-0 duration-500" style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}>
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notices.map((n) => (
          <div
            key={n.id}
            className={`rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 ${
              n.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300"
                : n.type === "warning"
                  ? "bg-amber-500/15 border-amber-500/35 text-amber-700 dark:text-amber-300"
                  : "bg-sky-500/15 border-sky-500/35 text-sky-700 dark:text-sky-300"
            }`}
          >
            {n.message}
          </div>
        ))}
      </div>

      <div className="glass-card relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-card/95 to-emerald-500/10 p-4 md:p-5 shadow-sm animate-in slide-in-from-top-2 duration-500">
        <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" /> Pantry Intelligence
            </p>
            <h1 className="mt-2 text-lg font-semibold text-foreground md:text-xl">Food Tracker</h1>
            <p className="text-xs text-muted-foreground mt-0.5 md:text-sm">Track expiry, reduce waste, and keep your kitchen fresh.</p>
          </div>
          <Button size="sm" onClick={openAdd} className="hidden md:inline-flex gap-1.5 shadow-sm">
            <Plus className="size-3.5" /> Add Item
          </Button>
        </div>

        <div className="relative mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Active Stock</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-2xl font-semibold text-foreground">{items.length}</p>
              <PackageOpen className="size-4 text-emerald-600/70 dark:text-emerald-300/80" />
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Expiring in 7 Days</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-2xl font-semibold text-foreground">{expiringSoon}</p>
              <Clock3 className="size-4 text-amber-600/70 dark:text-amber-300/80" />
            </div>
          </div>
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3">
            <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300">In Trash</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-2xl font-semibold text-foreground">{trash.length}</p>
              <Trash2 className="size-4 text-rose-600/70 dark:text-rose-300/80" />
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card flex items-center gap-2 rounded-xl border border-border/70 bg-card/85 p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab("active")}
          className={`h-8 flex-1 px-3 rounded-lg text-xs font-semibold transition-all ${activeTab === "active" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
        >
          <span className="inline-flex items-center gap-1.5"><List className="size-3.5" />Active</span>
        </button>
        <button
          onClick={() => setActiveTab("trash")}
          className={`h-8 flex-1 px-3 rounded-lg text-xs font-semibold transition-all ${activeTab === "trash" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
        >
          <span className="inline-flex items-center gap-1.5"><Trash2 className="size-3.5" />Trash</span>
        </button>
      </div>

      {activeTab === "active" ? (
        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <PackageOpen className="size-9 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No food items yet. Add your first item to start tracking.</p>
            </div>
          ) : (
            grouped.map(([month, groupItems], groupIndex) => (
              <div key={month} className="glass-card rounded-2xl border border-border/70 bg-card/90 p-3.5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${groupIndex * 80}ms` }}>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-sm font-semibold flex items-center gap-1.5"><Calendar className="size-3.5 text-primary" />{month}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{groupItems.length} items</span>
                </div>
                <div className="space-y-2.5 pl-3 border-l-2 border-primary/20">
                  {groupItems.map((item, itemIndex) => {
                    const d = daysUntil(item.expiryDate)
                    const countdown = getCountdownMeta(d)
                    return (
                      <div key={item.id} className="glass-card group relative flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/65 p-2.5 md:p-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 hover:bg-background/85" style={{ animationDelay: `${groupIndex * 80 + itemIndex * 30}ms` }}>
                        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary/50 transition-colors group-hover:bg-primary" />
                        <div className="min-w-0 pl-1.5">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.None}`}>
                              {item.category}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${countdown.className}`}>
                              {countdown.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Expires {prettyDate(item.expiryDate)}</span>
                          </div>
                          {item.notes && <p className="mt-1 text-[11px] text-muted-foreground truncate">{item.notes}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="outline" size="icon" onClick={() => openEdit(item)} className="size-7 border-border/70">
                            <Edit3 className="size-3.5" />
                          </Button>
                          <Button variant="destructive" size="icon" onClick={() => moveToTrash(item.id)} className="size-7">
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-border/70 bg-card/90 p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Deleted Items</p>
            {trash.length > 0 && <Button variant="outline" size="sm" onClick={clearTrash} className="h-7 px-2 text-[11px]">Clear Trash</Button>}
          </div>
          {trash.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Trash is empty.</p>
          ) : (
            trash.map((item) => (
              <div key={item.id} className="glass-card flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/15 p-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.None}`}>
                      {item.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Deleted {item.deletedAt ? prettyDate(item.deletedAt) : "-"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => restoreItem(item.id)} className="size-7 border-border/70" title="Restore item">
                    <Undo2 className="size-3.5" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => permanentDelete(item.id)} className="size-7" title="Delete permanently">
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card max-w-md border-border/70 bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Food Item" : "Add Food Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Milk" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Expiry Date</label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional note" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={saveItem}>{editing ? "Save" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={activeTab === "trash" ? clearTrash : openAdd}
        disabled={activeTab === "trash" && trash.length === 0}
        variant={activeTab === "trash" ? "destructive" : "default"}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 size-12 rounded-full shadow-xl md:hidden animate-[food-fab-enter_420ms_cubic-bezier(0.22,1,0.36,1)]"
        aria-label={activeTab === "trash" ? "Clear trash" : "Add food item"}
      >
        {activeTab !== "trash" && expiringSoon > 0 && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-400 animate-ping" />}
        {activeTab === "trash" ? (
          <Trash2 className="size-5 animate-[food-fab-float_3s_ease-in-out_infinite]" />
        ) : (
          <Plus className="size-5 animate-[food-fab-float_3s_ease-in-out_infinite]" />
        )}
      </Button>
    </div>
  )
}

export default FoodTracker
