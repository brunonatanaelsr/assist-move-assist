import { useCallback, useMemo, useState } from "react";
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
  GraduationCap,
  TrendingUp,
  FolderKanban,
  MessageSquare,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

type Role = "guest" | "user" | "admin" | "super_admin" | "superadmin";

interface MenuChildItem {
  title: string;
  href: string;
  allowedRoles: Role[];
}

interface MenuItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  children?: MenuChildItem[];
  allowedRoles: Role[];
}

const ADMIN_ROLES: Role[] = ["admin", "super_admin", "superadmin"];
const STAFF_ROLES: Role[] = ["user", ...ADMIN_ROLES];

const roleAliases: Record<string, Role> = {
  admin: "admin",
  super_admin: "super_admin",
  superadmin: "superadmin",
  user: "user",
  colaborador: "user",
  colaboradora: "user",
  collaborator: "user",
  colaborator: "user"
};

const normalizeRole = (role?: string | null): Role => {
  if (!role) return "guest";
  const normalized = role.toLowerCase();
  if (roleAliases[normalized]) {
    return roleAliases[normalized];
  }

  const knownRoles: Role[] = ["guest", "user", "admin", "super_admin", "superadmin"];
  return knownRoles.includes(normalized as Role) ? (normalized as Role) : "guest";
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
    allowedRoles: STAFF_ROLES
  },
  {
    title: "Beneficiárias",
    icon: Users,
    href: "/beneficiarias",
    allowedRoles: STAFF_ROLES
  },
  {
    title: "Novo Cadastro",
    icon: UserPlus,
    href: "/beneficiarias/nova",
    allowedRoles: ADMIN_ROLES
  },
  {
    title: "Oficinas",
    icon: GraduationCap,
    href: "/oficinas",
    allowedRoles: STAFF_ROLES
  },
  {
    title: "Projetos",
    icon: FolderKanban,
    href: "/projetos",
    allowedRoles: STAFF_ROLES
  },
  {
    title: "Feed",
    icon: Heart,
    href: "/feed",
    allowedRoles: STAFF_ROLES
  },
  {
    title: "Chat Interno",
    icon: MessageSquare,
    href: "/chat-interno",
    allowedRoles: STAFF_ROLES
  },
  {
    title: "Formulários",
    icon: FileText,
    allowedRoles: STAFF_ROLES,
    children: [
      { title: "Declarações e Recibos", href: "/declaracoes-recibos", allowedRoles: STAFF_ROLES },
      { title: "Anamnese Social", href: "/formularios/anamnese", allowedRoles: STAFF_ROLES },
      { title: "Ficha de Evolução", href: "/formularios/evolucao", allowedRoles: STAFF_ROLES },
      { title: "Termo de Consentimento", href: "/formularios/termo", allowedRoles: STAFF_ROLES },
      { title: "Visão Holística", href: "/formularios/visao", allowedRoles: STAFF_ROLES },
      { title: "Roda da Vida", href: "/formularios/roda-vida", allowedRoles: STAFF_ROLES },
      { title: "Plano de Ação", href: "/formularios/plano", allowedRoles: STAFF_ROLES },
      { title: "Matrícula de Projetos", href: "/formularios/matricula", allowedRoles: STAFF_ROLES }
    ]
  },
  {
    title: "Relatórios",
    icon: BarChart3,
    href: "/relatorios",
    allowedRoles: ADMIN_ROLES
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    href: "/analytics",
    allowedRoles: ADMIN_ROLES
  }
];

const settingsItem: MenuItem = {
  title: "Configurações",
  icon: Settings,
  href: "/configuracoes",
  allowedRoles: ADMIN_ROLES
};

const filterMenuItems = (
  items: MenuItem[],
  hasAccess: (roles: Role[]) => boolean
): MenuItem[] =>
  items.reduce<MenuItem[]>((acc, item) => {
    if (!hasAccess(item.allowedRoles)) {
      return acc;
    }

    if (item.children) {
      const allowedChildren = item.children.filter(child => hasAccess(child.allowedRoles));
      if (allowedChildren.length === 0) {
        return acc;
      }
      acc.push({ ...item, children: allowedChildren });
      return acc;
    }

    acc.push(item);
    return acc;
  }, []);

const normalizeTitleForId = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const getSidebarItemId = (title: string, suffix: string) => {
  const normalized = normalizeTitleForId(title);
  return `sidebar-${normalized || "item"}-${suffix}`;
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Formulários"]);
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  const userRole = useMemo(() => normalizeRole(user?.papel), [user?.papel]);

  const hasAccess = useCallback(
    (roles: Role[]) => {
      if (roles.includes("guest")) return true;
      if (isAdmin) return true;
      return roles.includes(userRole);
    },
    [isAdmin, userRole]
  );

  const availableMenuItems = useMemo(
    () => filterMenuItems(menuItems, hasAccess),
    [hasAccess]
  );

  const canViewSettings = hasAccess(settingsItem.allowedRoles);

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

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="mobile-menu-toggle"
        aria-label={isOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
        aria-expanded={isOpen}
        aria-controls="sidebar-navigation"
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
      <aside
        id="sidebar-navigation"
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 transform bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="mobile-navigation"
      >
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
            {availableMenuItems.map((item) => {
              const isExpanded = expandedItems.includes(item.title);
              const baseId = getSidebarItemId(item.title, "section");
              const buttonId = `${baseId}-button`;
              const submenuId = `${baseId}-submenu`;

              return (
                <div key={item.title}>
                  {item.children ? (
                    <div>
                      <Button
                        id={buttonId}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          isExpanded && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                        onClick={() => toggleExpanded(item.title)}
                        aria-expanded={isExpanded}
                        aria-controls={submenuId}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.title}
                        <ClipboardList
                          className={cn(
                            "h-4 w-4 ml-auto transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </Button>
                      {isExpanded && (
                        <ul
                          id={submenuId}
                          role="menu"
                          aria-labelledby={buttonId}
                          className="ml-6 mt-2 space-y-1"
                        >
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <NavLink
                                to={child.href}
                                className={({ isActive }) => cn(
                                  "block px-3 py-2 text-sm rounded-md transition-colors",
                                  isActive
                                    ? "bg-primary text-primary-foreground shadow-soft"
                                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                                onClick={() => setIsOpen(false)}
                                role="menuitem"
                              >
                                {child.title}
                              </NavLink>
                            </li>
                          ))}
                        </ul>
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
              );
            })}
          </nav>

          {/* Footer */}
          {canViewSettings && (
            <div className="p-4 border-t border-sidebar-border">
              <NavLink
                to={settingsItem.href!}
                className={({ isActive }) => cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                onClick={() => setIsOpen(false)}
              >
                <settingsItem.icon className="h-4 w-4" />
                {settingsItem.title}
              </NavLink>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
