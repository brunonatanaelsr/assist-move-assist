import { ReactNode } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
// Mensageria avançada desativada por enquanto
const MessagingSystem = () => null as any;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 md:ml-64">
        <Header />
        
        <main className="p-6">
          {children}
        </main>
      </div>
      
      <MessagingSystem />
    </div>
  );
}
