import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,filter] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground bg-gradient-to-b from-[hsl(224_90%_60%)] to-[hsl(228_84%_50%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_24px_-12px_hsl(224_86%_45%/0.75)] hover:-translate-y-px hover:brightness-110",
        outline: "border border-border bg-white text-foreground shadow-[0_1px_0_rgba(255,255,255,1)_inset,0_6px_14px_-10px_hsl(224_60%_40%/0.4)] hover:-translate-y-px hover:border-primary/50 hover:bg-accent",
        ghost: "hover:bg-ink/[0.06]",
        destructive: "border border-destructive/40 bg-destructive/15 text-[hsl(0_70%_40%)] hover:bg-destructive/25",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
