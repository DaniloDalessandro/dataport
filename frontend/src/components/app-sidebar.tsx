import * as React from "react"
import {
  Database,
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  FileText,
  AlertCircle,
  Settings,
  HelpCircle
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"

// Navigation data for DataPort - Data Management System
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Gestão de Dados",
      url: "/datasets",
      icon: Database,
    },
    {
      title: "Usuários e Operadores",
      url: "/data-operators",
      icon: Users,
    },
    {
      title: "Relatórios e Análises",
      url: "/reports",
      icon: FileSpreadsheet,
    },
    {
      title: "Solicitações",
      url: "/solicitacoes",
      icon: FileText,
    },
    {
      title: "Alertas e Issues",
      url: "/alerts",
      icon: AlertCircle,
    },
    {
      title: "Configurações",
      url: "/settings",
      icon: Settings,
    },
    {
      title: "Ajuda",
      url: "/ajuda",
      icon: HelpCircle,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Get user data from localStorage
  const [user, setUser] = React.useState({
    name: "Usuário",
    email: "user@dataport.com",
    avatar: "",
  })

  React.useEffect(() => {
    // Load user data from localStorage
    const userData = localStorage.getItem("user_data")
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        setUser({
          name: `${parsed.first_name || ""} ${parsed.last_name || ""}`.trim() || "Usuário",
          email: parsed.email || "user@dataport.com",
          avatar: "",
        })
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }
  }, [])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Database className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">DataPort</span>
                  <span className="text-xs">Sistema de Gestão de Dados</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
