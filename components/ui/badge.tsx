import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "secondary" | "outline";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-medium",
        {
          "bg-primary/10 text-primary border border-primary/20": variant === "default" || variant === "success",
          "bg-tertiary/10 text-tertiary border border-tertiary/20": variant === "warning",
          "bg-error/10 text-error border border-error/20": variant === "danger",
          "bg-surface-container-highest text-on-surface-variant": variant === "secondary",
          "border border-outline-variant text-on-surface-variant": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
