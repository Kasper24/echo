"use client";

import React from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Input } from "@repo/ui/components/input";
import { Badge } from "@repo/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import api from "@repo/web/api";
import { SearchProvider, useSearch } from "../_providers/search-context";
import { useQuery } from "@tanstack/react-query";
import { useCurrentChat } from "@repo/web/app/(private)/_providers/current-chat-provider";
import { cn } from "@repo/ui/lib/utils";
import { format, isSameWeek } from "date-fns";

const SearchChats = () => {
  const { searchQuery, setSearchQuery } = useSearch();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search for Chats"
        className="pl-9"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
};

const Header = () => {
  return (
    <div className="border-b p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Chats</h1>
        <Button variant="ghost" size="icon">
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      <SearchChats />
    </div>
  );
};

const Chat = ({
  id,
  picture,
  name,
  lastMessage,
  lastMessageTime,
  unreadMessagesCount,
}: {
  id: number;
  picture?: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadMessagesCount: number;
}) => {
  const { chatId, setChatId } = useCurrentChat();

  const messageFormatDate = (date: Date) => {
    return isSameWeek(new Date(), date)
      ? format(date, "iiii")
      : format(date, "dd/MM/yyyy");
  };

  return (
    <div
      key={id}
      className={cn(
        "flex items-center space-x-4 rounded-md p-3 cursor-pointer",
        {
          "bg-muted": chatId === id,
          "hover:bg-muted/50": chatId !== id,
        }
      )}
      onClick={() => setChatId(id)}
    >
      <Avatar className="size-12">
        <AvatarImage src={picture} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>
      <div className="w-full">
        <div className="flex justify-between gap-10">
          <p className="truncate font-medium max-w-[150px]">{name}</p>
          {lastMessageTime && (
            <span className="text-muted-foreground text-xs">
              {messageFormatDate(lastMessageTime)}
            </span>
          )}
        </div>
        <div className="flex justify-between gap-10">
          <p className="text-muted-foreground truncate text-sm max-w-[150px]">
            {lastMessage}
          </p>
          {unreadMessagesCount > 0 && (
            <Badge className="rounded-full">{unreadMessagesCount}</Badge>
          )}
        </div>
      </div>
    </div>
  );
};

const Chats = () => {
  const { searchQuery } = useSearch();
  const { isPending, isError, data } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const { status, data } = await api.chat[""].get();
      if (status === "OK") return data;
      throw new Error(data.error.message);
    },
  });

  if (isPending) return <div className="p-4 w-full">Loading...</div>;
  if (isError)
    return <div className="p-4 text-red-500">Error loading chats</div>;

  const filteredChats = searchQuery.trim()
    ? data.chats.filter((chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : data.chats;

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-4">
        <div className="space-y-1">
          {filteredChats.map((chat) => (
            <Chat
              key={chat.id}
              id={chat.id}
              picture={chat.picture ?? undefined}
              name={chat.name}
              lastMessage={chat.latestMessage?.content}
              lastMessageTime={chat.latestMessage?.createdAt}
              unreadMessagesCount={chat.unreadMessagesCount}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

const ChatList = () => {
  return (
    <div className="flex flex-col border-r">
      <SearchProvider>
        <Header></Header>
        <Chats></Chats>
      </SearchProvider>
    </div>
  );
};

export default ChatList;
