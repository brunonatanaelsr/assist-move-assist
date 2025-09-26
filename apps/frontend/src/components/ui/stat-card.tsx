import { HTMLAttributes, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string;
}

const StatCard = ({
  title,
  value,
  description,
  icon,
  variant = "default",
  className,
  ...cardProps
}: StatCardProps) => {
  const variantStyles = {
    default: "border-border",
    primary: "border-primary/20 bg-primary-light/50",
    success: "border-success/20 bg-success-light/50", 
    warning: "border-warning/20 bg-warning-light/50"
  };

  return (
    <Card {...cardProps} className={cn(
      "transition-smooth hover:shadow-soft",
      variantStyles[variant],
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn(
            "h-4 w-4",
            variant === "primary" && "text-primary",
            variant === "success" && "text-success", 
            variant === "warning" && "text-warning",
            variant === "default" && "text-muted-foreground"
          )}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;