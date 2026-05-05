import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { FormSubmissionStatus } from "@/lib/types";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        sent: "border-transparent bg-slate-200 text-slate-700",
        opened: "border-transparent bg-amber-100 text-amber-700",
        signed: "border-transparent bg-emerald-100 text-emerald-700",
        draft: "border-transparent bg-gray-100 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function statusBadgeVariant(
  status: FormSubmissionStatus
): "sent" | "opened" | "signed" | "draft" {
  switch (status) {
    case "sent":
      return "sent";
    case "opened":
      return "opened";
    case "signed":
      return "signed";
    case "draft":
      return "draft";
  }
}

export { Badge, badgeVariants };
