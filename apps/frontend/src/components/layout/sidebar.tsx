import { useMemo, useState } from "react";
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

type MenuChild = {
  title: string;
  href: string;
  adminOnly?: boolean;
};

type MenuItem = {
  title: string;
  icon: LucideIcon;
  href?: string;
  children?: MenuChild[];
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard"
  },
  {
    title: "Beneficiárias",
    icon: Users,
    href: "/beneficiarias"
  },
  {
    title: "Novo Cadastro",
    icon: UserPlus,
    href: "/beneficiarias/nova"
  },
  {
    title: "Oficinas",
    icon: GraduationCap,
    href: "/oficinas"
  },
  {
    title: "Projetos",
    icon: FolderKanban,
    href: "/projetos"
  },
  {
    title: "Feed",
    icon: Heart,
    href: "/feed"
  },
  {
    title: "Chat Interno",
    icon: MessageSquare,
    href: "/chat-interno"
  },
  {
    title: "Formulários",
    icon: FileText,
    children: [
      { title: "Declarações e Recibos", href: "/declaracoes-recibos" },
      { title: "Anamnese Social", href: "/formularios/anamnese" },
      { title: "Ficha de Evolução", href: "/formularios/evolucao" },
      { title: "Termo de Consentimento", href: "/formularios/termo" },
      { title: "Visão Holística", href: "/formularios/visao" },
      { title: "Roda da Vida", href: "/formularios/roda-vida" },
      { title: "Plano de Ação", href: "/formularios/plano" },
      { title: "Matrícula de Projetos", href: "/formularios/matricula" }
    ]
  },
  {
    title: "Relatórios",
    icon: BarChart3,
    href: "/relatorios",
    adminOnly: true
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    href: "/analytics",
    adminOnly: true
  }
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Formulários"]);
  const location = useLocation();
  const { isAdmin } = useAuth();

  const filteredMenuItems = useMemo(() =>
    menuItems
      .map(item => ({
        ...item,
        children: item.children?.filter(child => !child.adminOnly || isAdmin)
      }))
      .filter(item => {
        if (item.adminOnly && !isAdmin) {
          return false;
        }
        if (item.children && item.children.length === 0) {
          return false;
        }
        return true;
      })
  , [isAdmin]);

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
            {filteredMenuItems.map((item) => (
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
                    {expandedItems.includes(item.title) && (
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
          <div className="p-4 border-t border-sidebar-border">
            {isAdmin && (
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
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
