"use client";

import React from "react";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Badge } from "@repo/ui/components/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import api from "@repo/web/api";
import { useSearch } from "../_providers/search-provider";
import { useQuery } from "@tanstack/react-query";
import { useCurrentChat } from "@repo/web/app/(private)/(main)/_providers/current-chat-provider";
import { cn } from "@repo/ui/lib/utils";
import { format, isSameWeek } from "date-fns";
import { Skeleton } from "@repo/ui/components/skeleton";

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

  const messageDate = lastMessageTime
    ? isSameWeek(new Date(), lastMessageTime)
      ? format(lastMessageTime, "iiii")
      : format(lastMessageTime, "dd/MM/yyyy")
    : "";

  return (
    <div
      key={id}
      className={cn(
        "flex items-center space-x-4 rounded-md p-3 cursor-pointer space-y-1",
        {
          "bg-muted": chatId === id,
          "hover:bg-muted/50": chatId !== id,
        },
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
            <span className="text-muted-foreground text-xs">{messageDate}</span>
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

const ChatList = () => {
  const { searchQuery } = useSearch();
  const { isPending, isError, data } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const { data } = await api.chat[""].get({
        options: {
          throwOnErrorStatus: true,
        },
      });
      return data;
    },
  });

  const filteredChats = searchQuery.trim()
    ? data?.chats.filter((chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : data?.chats;

  return (
    <ScrollArea className="h-[calc(100vh-190px)]">
      {isPending && (
        <>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3 border-b">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </>
      )}

      {isError && <div className="p-4 text-red-500">Error loading chats</div>}

      {!isPending &&
        !isError &&
        filteredChats?.length === 0 &&
        searchQuery.trim() && (
          <div className="p-4 text-muted-foreground">No chats found</div>
        )}

      {!isPending &&
        !isError &&
        filteredChats?.length === 0 &&
        !searchQuery.trim() && (
          <div className="p-4 text-muted-foreground">No chats yet</div>
        )}

      {filteredChats?.map((chat) => (
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
    </ScrollArea>
  );
};

export default ChatList;
