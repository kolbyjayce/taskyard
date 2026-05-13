import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90":
              variant === "default",
            "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30":
              variant === "destructive",
            "border border-border bg-transparent hover:bg-secondary":
              variant === "outline",
            "hover:bg-secondary hover:text-foreground text-muted-foreground":
              variant === "ghost",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80":
              variant === "secondary",
          },
          {
            "h-7 px-2.5 text-xs": size === "sm",
            "h-9 px-4 text-sm": size === "md",
            "h-11 px-6 text-base": size === "lg",
            "h-8 w-8": size === "icon",
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
