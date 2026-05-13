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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-green-500/20 text-green-400 border border-green-500/30": variant === "default" || variant === "success",
          "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30": variant === "warning",
          "bg-red-500/20 text-red-400 border border-red-500/30": variant === "danger",
          "bg-[#2a2a2a] text-gray-400 border border-[#333]": variant === "secondary",
          "border border-[#2a2a2a] text-gray-400": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
