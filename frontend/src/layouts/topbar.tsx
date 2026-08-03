import { ChevronDown, LogOut, Menu, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth-store";

type TopbarProps = {
  onMenuClick: () => void;
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const logout = useAuthStore((state) => state.logout);
  const displayName = currentUser?.full_name ?? "Compte TaskMiner";
  const initials = currentUser?.full_name
    ? currentUser.full_name
        .split(" ")
        .slice(0, 2)
        .map((part) => part.at(0))
        .join("")
        .toUpperCase()
    : "TM";

  return (
    <header className="bg-background/90 sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 shadow-xs backdrop-blur-xl sm:px-6">
      <Button
        aria-label="Ouvrir le menu"
        className="lg:hidden"
        onClick={onMenuClick}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Menu aria-hidden="true" className="size-5" />
      </Button>
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Ouvrir le menu utilisateur"
              className="h-auto gap-3 px-2 py-1.5"
              type="button"
              variant="ghost"
            >
              {currentUser?.avatar_url ? (
                <img
                  alt=""
                  className="size-9 rounded-full border object-cover shadow-sm"
                  src={currentUser.avatar_url}
                />
              ) : (
                <span className="bg-primary text-primary-foreground ring-primary/10 flex size-9 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-2">
                  {initials}
                </span>
              )}
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-48 truncate text-sm font-medium">
                  {displayName}
                </span>
                <span className="text-muted-foreground block max-w-48 truncate text-xs font-normal">
                  {currentUser?.email ?? "Session active"}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="text-muted-foreground hidden size-4 sm:block"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <span className="flex items-center gap-2">
                <UserRound aria-hidden="true" className="size-4" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {displayName}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {currentUser?.email ?? "Session active"}
                  </span>
                </span>
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}>
              <LogOut aria-hidden="true" className="size-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
