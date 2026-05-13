import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-colors disabled:opacity-50 appearance-none cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

export { Select };
