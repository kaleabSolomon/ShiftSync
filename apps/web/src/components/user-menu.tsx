import { api } from "@ShiftSync/backend/convex/_generated/api";
import { Button } from "@ShiftSync/ui/components/button";
import { Avatar, AvatarFallback } from "@ShiftSync/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ShiftSync/ui/components/dropdown-menu";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const router = useRouter();
  const user = useQuery(api.auth.getCurrentUser);
  const profile = useQuery(api.userProfiles.getMyProfile);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="relative h-9 w-9 rounded-md">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        }
      >
        {getInitials(user?.name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card w-56" align="end">
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-sm font-medium leading-none">
            {profile?.name ?? user?.name}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
            {profile?.role && (
              <span className="capitalize text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-sm">
                {profile.role}
              </span>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/");
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
