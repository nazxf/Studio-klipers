import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 active:translate-y-px active:scale-[0.99] disabled:pointer-events-none disabled:translate-y-0 disabled:scale-100 disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(0.99_0.04_124/0.45),0_0_0_1px_oklch(var(--primary)/0.16)] hover:bg-[oklch(0.86_0.215_124)] hover:shadow-[inset_0_1px_0_oklch(0.99_0.04_124/0.5),0_0_0_1px_oklch(var(--primary)/0.22)]",
        secondary:
          "border border-border bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_oklch(var(--foreground)/0.035)] hover:border-border/80 hover:bg-muted",
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/25 hover:bg-secondary",
        ghost: "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "h-auto p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-5",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
