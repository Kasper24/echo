import { Settings, MessageSquare, PhoneIcon } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import SidebarButton from "./sidebar-button";
import api from "@repo/web/api";

const navigationItems = [
  { icon: MessageSquare, label: "Messages", link: "/" },
  { icon: PhoneIcon, label: "Calls", link: "/calls" },
];

const UserAvatar = async () => {
  const { status, data } = await api.user[""].get();

  if (status !== "OK") {
    return null;
  }

  return (
    <Avatar className="size-10 mb-8">
      <AvatarImage src={data.picture ?? undefined} />
      <AvatarFallback>{data.name.slice(0, 1)}</AvatarFallback>
    </Avatar>
  );
};

const AppSidebar = () => {
  return (
    <div className="w-20 border-r flex flex-col items-center py-6 bg-card flex-none">
      <UserAvatar />
      <div className="flex-1 flex flex-col space-y-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <SidebarButton key={item.label} Icon={<Icon />} link={item.link} />
          );
        })}
      </div>
      <Button variant="ghost" size="icon" className="mt-auto">
        <Settings className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default AppSidebar;
