import { ReactNode } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
// Mensageria avançada desativada por enquanto
const MessagingSystem = () => null as any;
import QuickActions from "@/components/QuickActions";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 md:ml-64">
        {/* Skip to content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-2 focus:rounded"
        >
          Pular para o conteúdo
        </a>
        <Header />
        
        <main id="main-content" className="p-6">
          {children}
        </main>
      </div>
      
      <MessagingSystem />
      <QuickActions />
    </div>
  );
}
