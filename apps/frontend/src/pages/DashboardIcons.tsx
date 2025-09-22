import { Users, FileText, Calendar, TrendingUp, Heart, ClipboardCheck } from "lucide-react";

export default function DashboardIcons() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste Icons</h1>
      <div className="flex gap-4">
        <Users className="w-6 h-6" />
        <FileText className="w-6 h-6" />
        <Calendar className="w-6 h-6" />
        <TrendingUp className="w-6 h-6" />
        <Heart className="w-6 h-6" />
        <ClipboardCheck className="w-6 h-6" />
      </div>
    </div>
  );
}
