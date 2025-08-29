import { User, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/usePostgreSQLAuth";
import { Badge } from "@/components/ui/badge";
// Centro de notificações simplificado pode ser adicionado depois
const NotificationCenterSimple = () => null as any;

export default function Header() {
  const { profile, signOut } = useAuth();
  
  // Verificar se é admin baseado no profile
  const isAdmin = profile?.papel === 'admin' || profile?.papel === 'super_admin';

  const handleLogout = async () => {
    await signOut();
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  if (!profile) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <img 
            src={logo} 
            alt="Move Marias Logo" 
            className="h-12 w-auto object-contain"
          />
        </div>
        <h2 className="text-lg font-semibold text-foreground md:block hidden">
          Sistema de Gestão - Instituto Move Marias
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <NotificationCenterSimple />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {getInitials(profile.nome || '')}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{profile.nome}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {profile.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                    {isAdmin ? (
                      <>
                        <Shield className="w-3 h-3 mr-1" />
                        Administrador
                      </>
                    ) : (
                      'Profissional'
                    )}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
