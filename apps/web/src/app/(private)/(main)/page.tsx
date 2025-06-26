"use client";

import React from "react";
import { ChevronDown, MessageSquare, Phone, Search } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import useMediaQuery from "@repo/web/hooks/use-media-query";
import { cn } from "@repo/ui/lib/utils";
import CurrentChat from "./_components/current-chat";
import ChatList from "./_components/chat-list";
import { useSearch } from "./_providers/search-provider";
import { useUser } from "./_hooks/user-provider";
import { useCurrentChat } from "./_providers/current-chat-provider";
import { useCurrentTab } from "./_providers/current-tab-provider";
import CallList from "./_components/call-list";
import SettingsDrawer from "./_components/settings-drawer";
import { useSettingsDrawer } from "./_providers/settings-drawer-provider";

const MainPage = () => {
  const { isMobile } = useMediaQuery();
  const { chatId } = useCurrentChat();

  return (
    <div className="flex">
      {((isMobile && !chatId) || !isMobile) && <Sidebar />}
      {((isMobile && chatId) || !isMobile) && <MainArea />}
      <SettingsDrawer />
    </div>
  );
};

const Sidebar = () => {
  const { currentTab, setCurrentTab } = useCurrentTab();
  const { setSearchQuery } = useSearch();
  const { isMobile } = useMediaQuery();

  return (
    <div
      className={cn({
        "border-r w-[24rem]": !isMobile,
        "w-full": isMobile,
      })}
    >
      <Header />
      <Tabs
        value={currentTab}
        onValueChange={(tab) => {
          setCurrentTab(tab);
          setSearchQuery("");
        }}
        className="gap-y-3 p-3"
      >
        <TabsList className="w-full">
          <TabsTrigger value="chats" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chats
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Calls
          </TabsTrigger>
        </TabsList>
        <SearchInput />
        <TabsContent value="chats" className="">
          <ChatList />
        </TabsContent>
        <TabsContent value="calls" className="">
          <CallList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Header = () => {
  const { isError, isPending, data } = useUser();
  const { setSettingsOpen } = useSettingsDrawer();

  if (isPending) {
    return (
      <div className="h-16 px-4 border-b border-border flex items-center gap-2">
        <Skeleton className="size-8"></Skeleton>
        <Skeleton className="size-8 w-full"></Skeleton>
      </div>
    );
  }

  const displayName = isError ? "Unable to load" : data?.user?.name || "User";
  const displayDescription = isError
    ? "Connection error"
    : data?.user?.description;
  const avatarSrc = isError ? undefined : data?.user?.picture;
  const avatarFallback = isError ? "?" : data?.user?.name?.slice(0, 1) || "U";
  const statusColor = isError ? "bg-red-500" : "bg-green-500";

  return (
    <div className="h-16 px-4 border-b border-border flex items-center">
      <div
        className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-muted/50 rounded-md p-2 -m-2 transition-colors"
        onClick={() => setSettingsOpen(true)}
      >
        <div className="relative">
          <Avatar className="ring-2">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <span
            className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full ${statusColor} border-2 border-card`}
          ></span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{displayName}</h2>
          {displayDescription && (
            <p className="text-xs text-muted-foreground truncate max-w-70">
              {displayDescription}
            </p>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

const SearchInput = () => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { currentTab } = useCurrentTab();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={
          currentTab === "chats" ? "Search chat history" : "Search call history"
        }
        className="pl-9"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
};

const MainArea = () => {
  const { chatId } = useCurrentChat();
  const { currentTab } = useCurrentTab();

  return chatId ? (
    <CurrentChat />
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-screen">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        {currentTab === "chats" ? (
          <MessageSquare className="h-8 w-8 text-primary/60" />
        ) : (
          <Phone className="h-8 w-8 text-primary/60" />
        )}
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {currentTab === "chats" ? "Start a conversation" : "Make a call"}
      </h3>
      <p className="text-muted-foreground max-w-sm">
        {currentTab === "chats"
          ? "Select a contact to start chatting or search for a specific message."
          : "Select a contact from your call history or start a new call."}
      </p>
    </div>
  );
};

export default MainPage;
