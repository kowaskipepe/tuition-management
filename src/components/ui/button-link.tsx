import Link from "next/link"
import type { ComponentProps } from "react"
import type { VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>

export const ButtonLink = ({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonLinkProps) => {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
