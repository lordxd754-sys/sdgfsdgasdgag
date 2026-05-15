import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary/40",
          {
            "bg-primary-container text-on-primary hover:brightness-110 hover:glow-primary": variant === "default",
            "border border-outline-variant text-on-surface hover:bg-surface-container-high": variant === "outline",
            "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high": variant === "ghost",
            "bg-error/10 text-error border border-error/20 hover:bg-error/20": variant === "destructive",
            "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface": variant === "secondary",
          },
          {
            "py-2.5 px-5 text-sm": size === "default",
            "py-1.5 px-3 text-sm": size === "sm",
            "py-3 px-8 text-base": size === "lg",
            "h-9 w-9 p-0": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
