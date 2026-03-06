"use client"

import { ChevronRight, Settings2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

interface SettingsItem {
  title: string
  page: string
}

export function NavProjects({
  settingsItems,
  settingsOpen,
  onSettingsOpenChange,
  currentPage,
  onNavigate,
  isDarkMode,
  onDarkModeToggle,
  isEditMode,
  onEditModeToggle,
  searchQuery = "",
}: {
  settingsItems: SettingsItem[]
  settingsOpen: boolean
  onSettingsOpenChange: (open: boolean) => void
  currentPage?: string
  onNavigate?: (page: string) => void
  isDarkMode: boolean
  onDarkModeToggle: (checked: boolean) => void
  isEditMode: boolean
  onEditModeToggle: (checked: boolean) => void
  searchQuery?: string
}) {
  const isSearching = searchQuery.trim().length > 0
  const q = searchQuery.toLowerCase()

  const filteredSettings = isSearching
    ? settingsItems.filter(i => i.title.toLowerCase().includes(q))
    : settingsItems

  const showSettings = !isSearching
    ? true
    : ("settings".includes(q) || filteredSettings.length > 0)

  const showModeToggle = !isSearching || ["mode", "dark", "light"].some(k => k.includes(q) || q.includes(k))
  const showEditToggle = !isSearching || ["edit", "edit mode"].some(k => k.includes(q) || q.includes(k))

  // Hide the whole section if search matches nothing in Projects
  if (isSearching && !showSettings && !showModeToggle && !showEditToggle) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {/* Settings collapsible */}
        {showSettings && (
          <Collapsible
            asChild
            open={isSearching ? true : settingsOpen}
            onOpenChange={v => { if (!isSearching) onSettingsOpenChange(v) }}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Settings"
                className="transition-colors duration-150"
                onClick={() => { if (!isSearching) onSettingsOpenChange(!settingsOpen) }}
              >
                <Settings2 />
                <span>Settings</span>
              </SidebarMenuButton>
              <CollapsibleTrigger asChild>
                <SidebarMenuAction className="transition-transform duration-300 data-[state=open]:rotate-90">
                  <ChevronRight />
                  <span className="sr-only">Toggle</span>
                </SidebarMenuAction>
              </CollapsibleTrigger>
              <CollapsibleContent className="nav-collapsible-content">
                <SidebarMenuSub>
                  {filteredSettings.map(item => (
                    <SidebarMenuSubItem key={item.page}>
                      <SidebarMenuSubButton
                        asChild
                        className="transition-colors duration-150"
                        isActive={currentPage === item.page}
                      >
                        <a
                          href="#"
                          onClick={e => { e.preventDefault(); onNavigate?.(item.page) }}
                        >
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                  {showModeToggle && (
                    <SidebarMenuSubItem>
                      <div className="mt-1 flex items-center justify-between rounded-md px-2 py-1.5 border-t border-border/40">
                        <span className="text-sm font-medium text-foreground">Dark Mode</span>
                        <Switch
                          size="sm"
                          checked={isDarkMode}
                          onCheckedChange={onDarkModeToggle}
                        />
                      </div>
                    </SidebarMenuSubItem>
                  )}
                  {showEditToggle && (
                    <SidebarMenuSubItem>
                      <div className="flex items-center justify-between rounded-md px-2 py-1.5">
                        <span className="text-sm font-medium text-foreground">Edit Mode</span>
                        <Switch
                          size="sm"
                          checked={isEditMode}
                          onCheckedChange={onEditModeToggle}
                        />
                      </div>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        )}

      </SidebarMenu>
    </SidebarGroup>
  )
}
