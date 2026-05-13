import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-colors disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
