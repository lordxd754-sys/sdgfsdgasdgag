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
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500/50",
          {
            "bg-green-500 text-black hover:bg-green-400": variant === "default",
            "border border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a] hover:text-white": variant === "outline",
            "text-gray-400 hover:text-white hover:bg-[#2a2a2a]": variant === "ghost",
            "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20": variant === "destructive",
            "bg-[#2a2a2a] text-gray-300 hover:bg-[#333] hover:text-white": variant === "secondary",
          },
          {
            "h-10 px-4 py-2 text-sm": size === "default",
            "h-8 px-3 text-xs": size === "sm",
            "h-12 px-6 text-base": size === "lg",
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
