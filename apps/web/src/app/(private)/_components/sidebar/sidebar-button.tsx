"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

const SidebarButton = ({
  Icon,
  link,
}: {
  Icon: React.ReactElement;
  link: string;
}) => {
  const pathname = usePathname();
  const isActive = pathname === link;

  return (
    <Button
      asChild
      variant={isActive ? "secondary" : "ghost"}
      size="icon"
      className={cn("relative", {
        // "bg-primary": isActive,
      })}
    >
      <Link href={link}>
        <Icon.type
          {...Icon.props}
          className={cn("stroke-foreground size-5", {
            // "stroke-background": isActive,
          })}
        ></Icon.type>
        {isActive && (
          <div className="bg-primary absolute left-0 h-full w-1 rounded-r-full" />
        )}
      </Link>
    </Button>
  );
};

export default SidebarButton;
