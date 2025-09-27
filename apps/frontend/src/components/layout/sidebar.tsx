import { useMemo, useState, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Users,
  FileText,
  Heart, 
  BarChart3, 
  Settings, 
  Menu,
  X,
  Home,
  UserPlus,
  ClipboardList,
  FileCheck,
  Eye,
  Target,
  GraduationCap,
  TrendingUp,
  FolderKanban,
  MessageSquare,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type SidebarChild = {
  title: string;
  href: string;
  requiredPermissions?: string[];
  requiredRoles?: string[];
};

type SidebarItem = {
  title: string;
  icon: LucideIcon;
  href?: string;
  children?: SidebarChild[];
  requiredPermissions?: string[];
  requiredRoles?: string[];
};

const MENU_ITEMS: SidebarItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard"
  },
  {
    title: "Beneficiárias",
    icon: Users,
    href: "/beneficiarias",
    requiredPermissions: ["beneficiarias.view"]
  },
  {
    title: "Novo Cadastro",
    icon: UserPlus,
    href: "/beneficiarias/nova",
    requiredPermissions: ["beneficiarias.create"]
  },
  {
    title: "Oficinas",
    icon: GraduationCap,
    href: "/oficinas",
    requiredPermissions: ["oficinas.view"]
  },
  {
    title: "Projetos",
    icon: FolderKanban,
    href: "/projetos",
    requiredPermissions: ["projetos.view"]
  },
  {
    title: "Feed",
    icon: Heart,
    href: "/feed",
    requiredPermissions: ["feed.view"]
  },
  {
    title: "Chat Interno",
    icon: MessageSquare,
    href: "/chat-interno",
    requiredPermissions: ["comunicacao.chat"]
  },
  {
    title: "Formulários",
    icon: FileText,
    requiredPermissions: ["formularios.view"],
    children: [
      { title: "Declarações e Recibos", href: "/declaracoes-recibos", requiredPermissions: ["formularios.declaracoes"] },
      { title: "Anamnese Social", href: "/formularios/anamnese", requiredPermissions: ["formularios.anamnese"] },
      { title: "Ficha de Evolução", href: "/formularios/evolucao", requiredPermissions: ["formularios.evolucao"] },
      { title: "Termo de Consentimento", href: "/formularios/termo", requiredPermissions: ["formularios.termo"] },
      { title: "Visão Holística", href: "/formularios/visao", requiredPermissions: ["formularios.visao"] },
      { title: "Roda da Vida", href: "/formularios/roda_vida", requiredPermissions: ["formularios.roda_vida"] },
      { title: "Plano de Ação", href: "/formularios/plano", requiredPermissions: ["formularios.plano"] },
      { title: "Matrícula de Projetos", href: "/formularios/matricula", requiredPermissions: ["formularios.matricula"] }
    ]
  },
  {
    title: "Relatórios",
    icon: BarChart3,
    href: "/relatorios",
    requiredPermissions: ["relatorios.view"]
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    href: "/analytics",
    requiredPermissions: ["analytics.view"]
  }
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Formulários"]);
  const location = useLocation();
  const { hasPermission, hasRole } = useAuth();

  const canAccess = useCallback(
    (item: { requiredPermissions?: string[]; requiredRoles?: string[] }) => {
      const permissionAllowed = item.requiredPermissions ? hasPermission(item.requiredPermissions) : true;
      const roleAllowed = item.requiredRoles ? hasRole(item.requiredRoles) : true;
      return permissionAllowed && roleAllowed;
    },
    [hasPermission, hasRole]
  );

  const menuItems = useMemo(() => {
    return MENU_ITEMS.reduce<SidebarItem[]>((acc, item) => {
      if (item.children?.length) {
        const visibleChildren = item.children.filter((child) => canAccess(child));

        const includeParent = item.href ? canAccess(item) : visibleChildren.length > 0;
        if (!includeParent) {
          return acc;
        }

        acc.push({ ...item, children: visibleChildren });
        return acc;
      }

      if (!canAccess(item)) {
        return acc;
      }

      acc.push(item);
      return acc;
    }, []);
  }, [canAccess]);

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  const canSeeSettings = canAccess({
    requiredPermissions: ["configuracoes.manage"],
    requiredRoles: ["admin", "super_admin", "superadmin"]
  });

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="mobile-menu-toggle"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 transform bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )} data-testid="mobile-navigation">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-sidebar-foreground">Move Marias</h1>
                <p className="text-xs text-sidebar-foreground/60">Sistema de Gestão</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <div key={item.title}>
                {item.children ? (
                  <div>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        expandedItems.includes(item.title) && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                      onClick={() => toggleExpanded(item.title)}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                      <ClipboardList className={cn(
                        "h-4 w-4 ml-auto transition-transform",
                        expandedItems.includes(item.title) && "rotate-90"
                      )} />
                    </Button>
                    {item.children.length > 0 && expandedItems.includes(item.title) && (
                      <div className="ml-6 mt-2 space-y-1">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            className={({ isActive }) => cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors",
                              isActive 
                                ? "bg-primary text-primary-foreground shadow-soft" 
                                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                            onClick={() => setIsOpen(false)}
                          >
                            {child.title}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    to={item.href}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-primary text-primary-foreground shadow-soft" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    onClick={() => setIsOpen(false)}
                    data-testid={
                      item.href === '/dashboard' ? 'menu-dashboard' :
                      item.href === '/beneficiarias' ? 'menu-beneficiarias' :
                      item.href === '/oficinas' ? 'menu-oficinas' :
                      item.href === '/projetos' ? 'menu-projetos' :
                      item.href === '/feed' ? 'menu-feed' :
                      item.href === '/relatorios' ? 'menu-relatorios' : undefined
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </NavLink>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          {canSeeSettings && (
            <div className="p-4 border-t border-sidebar-border">
              <NavLink
                to="/configuracoes"
                className={({ isActive }) => cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Configurações
              </NavLink>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
