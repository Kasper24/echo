"use client";

import React from "react";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Video,
  Phone,
  MoreHorizontal,
  Paperclip,
  Smile,
  Send,
  Check,
  ExternalLink,
  CheckCheck,
  File,
  Download,
  Copy,
  X,
  Edit,
  MessageCircle,
  PlusCircle,
  LogOut,
  Crown,
  ImageIcon,
  Users,
  ArrowLeft,
  Search,
  Calendar,
} from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { toast } from "sonner";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Label } from "@repo/ui/components/label";
import { Card, CardContent } from "@repo/ui/components/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import api, { type ApiOutputs } from "@repo/web/api";
import { useCurrentChat } from "@repo/web/app/(private)/(main)/_providers/current-chat-provider";
import { useInView } from "react-intersection-observer";
import useMediaQuery from "@repo/web/hooks/use-media-query";
import { useUserId } from "../_hooks/user-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@repo/ui/components/sheet";
import {
  SearchDrawerProvider,
  useSearchDrawer,
} from "../_providers/search-drawer-provider copy";

type ChatMessage =
  ApiOutputs["/chat"]["/:chatId/messages"]["get"]["messages"][number];
type ChatMessageAttachment =
  ApiOutputs["/chat"]["/:chatId/messages"]["get"]["messages"][number]["attachments"][number];

const useCurrentChatDetails = () => {
  const { chatId } = useCurrentChat();
  return useQuery({
    queryKey: ["chatDetails", chatId],
    enabled: chatId !== null,
    queryFn: async () => {
      const { data } = await api.chat[":chatId"].get({
        input: {
          path: {
            chatId: chatId!.toString(),
          },
        },
        options: {
          throwOnErrorStatus: true,
        },
      });

      return data;
    },
  });
};

const useToggleBlockUser = () => {
  const { chatId } = useCurrentChat();
  const { data } = useCurrentChatDetails();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!data || !data.chat.otherUser) return;
      await api.block[":userId"][
        data.chat.otherUser.isBlocked ? "delete" : "post"
      ]({
        input: {
          path: {
            userId: data.chat.otherUser.id.toString(),
          },
        },
        options: {
          throwOnErrorStatus: true,
        },
      });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["chatDetails", chatId] });
      const previousIsBlocked = data?.chat?.otherUser?.isBlocked;
      queryClient.setQueryData(["chatDetails", chatId], () => ({
        ...data,
        chat: {
          ...data!.chat,
          otherUser: {
            ...data!.chat.otherUser,
            isBlocked: !data!.chat.otherUser!.isBlocked,
          },
        },
      }));
      return { previousIsBlocked };
    },
    onSuccess: (_, __, context) => {
      toast.success(
        `Successfully ${context?.previousIsBlocked ? "unblocked" : "blocked"} user.`
      );
    },
    onError: (_, __, context) => {
      queryClient.setQueryData(
        ["chatDetails", chatId],
        context?.previousIsBlocked
      );
      toast.error(
        `Failed to ${context?.previousIsBlocked ? "unblock" : "block"} user.`
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
    },
  });
};

const useMessageScroll = () => {
  const { chatId } = useCurrentChat();
  const queryClient = useQueryClient();

  const scrollToMessage = async (messageId: number) => {
    const messageElement = document.getElementById(`message-${messageId}`);

    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      messageElement.classList.add("highlight-message");
      setTimeout(() => {
        messageElement.classList.remove("highlight-message");
      }, 3000);
    } else {
      // Message not in DOM - need to load more messages
      // This could be enhanced to fetch specific pages or use a different API endpoint
      // that loads messages around a specific message ID

      try {
        // Invalidate and refetch messages to ensure we have the latest data
        await queryClient.invalidateQueries({
          queryKey: ["chatMessages", chatId],
        });

        // Wait a bit for the query to complete and DOM to update
        setTimeout(() => {
          const retryElement = document.getElementById(`message-${messageId}`);
          if (retryElement) {
            retryElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            retryElement.classList.add("highlight-message");
            setTimeout(() => {
              retryElement.classList.remove("highlight-message");
            }, 3000);
          }
        }, 1000);
      } catch (error) {
        console.error("Failed to load message:", error);
        toast.error("Could not navigate to message");
      }
    }
  };

  return { scrollToMessage };
};

const CurrentChat = () => {
  return (
    <div className="flex flex-col flex-1">
      <SearchDrawerProvider>
        <Header />
        <SearchMessagesDrawer />
      </SearchDrawerProvider>
      <MessagesList />
      <SendMessageContainer />
    </div>
  );
};

const Header = () => {
  const { isMobile } = useMediaQuery();
  const { setChatId } = useCurrentChat();
  const { data, isPending, isError } = useCurrentChatDetails();

  if (isPending) return null;
  if (isError) return null;

  if (!data) return null;

  return (
    <div className="flex items-center justify-between border-b p-4 h-16">
      <div className="flex items-center space-x-4">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setChatId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar>
          <AvatarImage src={data.chat.picture ?? undefined} />
          <AvatarFallback>{data.chat.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-sm font-medium">{data.chat.name}</h2>
          {data?.chat.type === "direct" && (
            <p className="text-xs text-muted-foreground">
              {data.chat.otherUser.status
                ? "Online"
                : `Last seen ${formatDistanceToNow(
                    data.chat.otherUser.lastSeen,
                    {
                      addSuffix: true,
                    }
                  )}`}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Video className="h-5 w-5" />
        </Button>
        <ChatDropdown />
      </div>
    </div>
  );
};

const ProfileDialog = () => {
  const [isFullScreenImage, setIsFullScreenImage] = React.useState(false);
  const { data } = useCurrentChatDetails();
  const toggleBlockUser = useToggleBlockUser();

  if (!data || data.chat.type !== "direct") return null;

  return (
    <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden max-h-[90vh] rounded-lg">
      <div className="sticky top-0 z-10 bg-background">
        <div className="relative h-60 w-full bg-muted">
          {isFullScreenImage ? (
            <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
              <Button
                onClick={() => setIsFullScreenImage(false)}
                className="absolute top-4 right-4 rounded-full p-2"
                size="icon"
                variant="secondary"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="relative h-full w-full">
                {data.chat.picture && (
                  <Image
                    src={data.chat.picture}
                    alt={data.chat.name}
                    fill
                    className="object-contain"
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {data.chat.picture && (
                <Image
                  src={data.chat.picture}
                  alt={data.chat.name}
                  fill
                  className="object-cover cursor-pointer"
                  onClick={() => setIsFullScreenImage(true)}
                  priority
                />
              )}
              <DialogClose
                asChild
                className="absolute top-4 right-4 rounded-full p-2"
              >
                <X className="h-4 w-4" />
              </DialogClose>
            </>
          )}
        </div>
        <DialogHeader className="pt-6 pb-2 px-6">
          <DialogTitle className="text-2xl font-bold">
            {data.chat.name}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {data.chat.otherUser?.status ? (
              <span className="text-green-500">Online</span>
            ) : data.chat.otherUser.lastSeen ? (
              `Last seen ${formatDistanceToNow(data.chat.otherUser.lastSeen, { addSuffix: true })}`
            ) : (
              "Offline"
            )}
          </div>
        </DialogHeader>
      </div>

      <div className="flex items-center justify-around p-3 border-b gap-x-2">
        <Button
          variant="ghost"
          className="flex flex-col items-center gap-1 grow h-auto p-2"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="text-xs">Message</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center gap-1 grow h-auto p-2"
        >
          <Phone className="h-6 w-6" />
          <span className="text-xs">Call</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center gap-1 grow h-auto p-2"
        >
          <Video className="h-6 w-6" />
          <span className="text-xs">Video</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center gap-1 grow h-auto p-2"
        >
          <MoreHorizontal className="h-6 w-6" />
          <span className="text-xs">More</span>
        </Button>
      </div>

      <Tabs defaultValue="info" className="flex flex-col min-h-[300px]">
        <TabsList className="mx-4 my-2 grid w-auto grid-cols-2">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-6">
          <TabsContent value="info" className="mt-0 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Phone
              </h3>
              <p>{data.chat.otherUser.phoneNumber || "Not available"}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Status
              </h3>
              <p>{data.chat.otherUser.status || "No status"}</p>
            </div>

            <div className="pt-4">
              <Button
                variant={
                  data.chat.otherUser.isBlocked ? "default" : "destructive"
                }
                className="w-full"
                onClick={() => toggleBlockUser.mutate()}
              >
                {data.chat.otherUser.isBlocked ? "Unblock" : "Block"}{" "}
                {data.chat.otherUser.name}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-0">
            <div className="mb-4 flex items-center">
              <ImageIcon className="mr-2 h-4 w-4" />
              <h3 className="text-sm font-medium">
                Media, Links and Documents
              </h3>
            </div>

            {/* {user.mediaItems && user.mediaItems.length > 0 ? (
              <MediaGallery items={user.mediaItems} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No media to display
              </div>
            )} */}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </DialogContent>
  );
};

const GroupDialog = () => {
  const [isFullScreenImage, setIsFullScreenImage] = React.useState(false);
  const { data } = useCurrentChatDetails();

  if (!data) return null;

  return (
    <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden max-h-[90vh] rounded-lg">
      <div className="sticky top-0 z-10 bg-background">
        <div className="relative h-60 w-full bg-muted">
          {isFullScreenImage ? (
            <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
              <Button
                onClick={() => setIsFullScreenImage(false)}
                className="absolute top-4 right-4 rounded-full p-2"
                size="icon"
                variant="secondary"
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="relative h-full w-full">
                {data.chat.picture && (
                  <Image
                    src={data.chat.picture}
                    alt={data.chat.name}
                    fill
                    className="object-contain"
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {data.chat.picture && (
                <Image
                  src={data.chat.picture}
                  alt={data.chat.name}
                  fill
                  className="object-cover cursor-pointer"
                  onClick={() => setIsFullScreenImage(true)}
                  priority
                />
              )}

              <Button
                className="absolute top-4 right-4 rounded-full p-2"
                size="icon"
                variant="secondary"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                className="absolute top-4 left-4 rounded-full p-2"
                size="icon"
                variant="secondary"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        <DialogHeader className="pt-6 pb-2 px-6">
          <DialogTitle className="text-2xl font-bold">
            {data.chat.name}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {data.chat.chatParticipants.length} participants
          </div>
        </DialogHeader>
      </div>

      <div className="flex items-center justify-around py-3 border-b">
        <Button
          variant="ghost"
          className="flex flex-col items-center gap-1 h-auto p-2"
        >
          <MessageCircle className="h-6 w-6" />
          <span className="text-xs">Message</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center gap-1 h-auto p-2"
        >
          <PlusCircle className="h-6 w-6" />
          <span className="text-xs">Add</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center gap-1 h-auto p-2"
        >
          <Edit className="h-6 w-6" />
          <span className="text-xs">Edit</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-col items-center gap-1 h-auto p-2"
        >
          <LogOut className="h-6 w-6" />
          <span className="text-xs">Leave</span>
        </Button>
      </div>

      <Tabs defaultValue="info" className="flex flex-col min-h-[300px]">
        <TabsList className="mx-4 my-2 grid w-auto grid-cols-3">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 p-6">
          <TabsContent value="info" className="mt-0 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Description
              </h3>
              <p>{data.chat.description}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Created
              </h3>
              <p>{format(data.chat.createdAt, "PPP")}</p>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                <h3 className="text-sm font-medium">
                  {data.chat.chatParticipants.length} Participants
                </h3>
              </div>
              <Button size="sm" variant="outline" className="h-8">
                <PlusCircle className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-4">
              {data.chat.chatParticipants.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden">
                    {member.user.picture && (
                      <Image
                        src={member.user.picture}
                        alt={member.user.name}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <p className="font-medium">{member.user.name}</p>
                      {member.role === "admin" && (
                        <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full flex items-center">
                          <Crown className="h-3 w-3 mr-1" /> Admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="media" className="mt-0">
            <div className="mb-4 flex items-center">
              <ImageIcon className="mr-2 h-4 w-4" />
              <h3 className="text-sm font-medium">
                Media, Links and Documents
              </h3>
            </div>

            {/* {group.mediaItems && group.mediaItems.length > 0 ? (
              <MediaGallery items={group.mediaItems} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No media to display
              </div>
            )} */}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </DialogContent>
  );
};

const SearchMessagesDrawer = () => {
  const { chatId } = useCurrentChat();
  const { isMobile } = useMediaQuery();
  const { searchOpen, setSearchOpen } = useSearchDrawer();
  const [searchTerm, setSearchTerm] = React.useState("");
  const { isPending, data } = useQuery({
    enabled: Boolean(chatId && searchTerm),
    queryKey: ["searchMessages", chatId, searchTerm],
    queryFn: async () => {
      const { data } = await api.chat[":chatId/messages/search"].get({
        input: {
          path: {
            chatId: chatId!.toString(),
          },
          query: {
            searchTerm: searchTerm,
          },
        },
        options: {
          throwOnErrorStatus: true,
        },
      });
      return data;
    },
  });
  const { scrollToMessage } = useMessageScroll();

  React.useEffect(() => {
    if (!searchOpen) {
      setSearchTerm("");
    }
  }, [searchOpen]);

  const handleMessageClick = (messageId: number) => {
    setSearchOpen(false);
    scrollToMessage(messageId);
  };

  return (
    <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col w-full sm:max-w-md p-0 bg-card",
          isMobile && "h-[85vh] rounded-t-xl"
        )}
      >
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </SheetClose>
            <SheetTitle className="text-left">Search Messages</SheetTitle>
          </div>
          {/* {conversation && (
            <SheetDescription className="text-left mt-1">
              Searching in chat with {conversation.name}
            </SheetDescription>
          )} */}
        </SheetHeader>

        <div className="p-4 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 ">
          {isPending ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-pulse text-muted-foreground">
                Searching...
              </div>
            </div>
          ) : searchTerm && (data?.messages.length || 0) > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                {data?.messages?.length}{" "}
                {data?.messages?.length === 1 ? "result" : "results"} found
              </div>

              {data?.messages?.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleMessageClick(message.id)}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(message.createdAt, "MMM d, yyyy • h:mm a")}
                  </div>
                  <div className="mt-1">
                    <p className="text-sm leading-relaxed">
                      {message.content
                        .split(new RegExp(`(${searchTerm})`, "gi"))
                        .map((part, i) =>
                          part.toLowerCase() === searchTerm.toLowerCase() ? (
                            <span
                              key={i}
                              className="bg-yellow-200 text-black font-medium px-0.5 rounded"
                            >
                              {part}
                            </span>
                          ) : (
                            part
                          )
                        )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Search className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">
                No messages found matching {searchTerm}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Search className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">
                Enter a search term to find messages
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

const ChatDropdown = () => {
  const { data } = useCurrentChatDetails();
  const toggleBlockUser = useToggleBlockUser();
  const { setSearchOpen } = useSearchDrawer();

  if (!data) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Chat Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setSearchOpen(true)}>
          Search Messages
        </DropdownMenuItem>
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              {data.chat.type === "group" ? "View info" : "View profile"}
            </DropdownMenuItem>
          </DialogTrigger>
          {data.chat.type === "group" ? <GroupDialog /> : <ProfileDialog />}
        </Dialog>
        {data.chat.type === "direct" && (
          <div>
            <DropdownMenuItem>Add Friend</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleBlockUser.mutate()}>
              {data.chat.otherUser.isBlocked ? "Unblock User" : "Block User"}
            </DropdownMenuItem>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          {data.chat.type === "group" ? "Leave Group" : "Delete Chat"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MessagesList = () => {
  const userId = useUserId();
  const { chatId } = useCurrentChat();
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ["chatMessages", chatId],
    enabled: chatId !== null,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.chat[":chatId/messages"].get({
        input: {
          path: { chatId: chatId!.toString() },
          query: { page: pageParam, limit: 50 },
        },
        options: {
          throwOnErrorStatus: true,
        },
      });

      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (data) => {
      if (data.pagination?.hasNext) {
        return data.pagination.nextPage;
      }

      return undefined;
    },
  });
  const { ref, inView } = useInView();

  React.useEffect(() => {
    if (inView) fetchNextPage();
  }, [inView, fetchNextPage]);

  const allMessages = React.useMemo(
    () => data?.pages.flatMap((page) => page.messages).reverse(),
    [data]
  );

  return (
    <ScrollArea
      className="h-[calc(100vh-135px)]"
      scrollTo={(scrollArea) => ({
        top: scrollArea.scrollHeight,
        behavior: "instant",
      })}
    >
      <div ref={ref} className="size-1"></div>
      {allMessages?.map((message, index, messages) => {
        const isSentByUser = message.sender.id === userId;

        const previous = index > 0 ? messages[index - 1] : null;
        const prevSenderId = previous?.sender.id;
        const prevDate = previous ? previous?.createdAt : undefined;

        return (
          <div key={message.id} id={`message-${message.id}`}>
            <DateDivider message={message} prevDate={prevDate} />
            <div
              className={cn(
                "bg-accent m-5 flex w-1/2 flex-col gap-y-2 rounded-sm p-2",
                {
                  "bg-primary text-secondary justify-self-end": isSentByUser,
                }
              )}
            >
              <MessageSender prevSenderId={prevSenderId} message={message} />
              <p>{message.content}</p>
              <MessageAttachments message={message} />
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs font-light">
                  {format(message.createdAt, "HH:mm")}
                </span>
                <MessageReadReceipt message={message} />
              </div>
            </div>
          </div>
        );
      })}
    </ScrollArea>
  );
};

const DateDivider = ({
  message,
  prevDate,
}: {
  message: ChatMessage;
  prevDate: Date | undefined;
}) => {
  const showDate =
    prevDate?.toDateString() !== message.createdAt.toDateString();

  if (!showDate) return null;

  return (
    <div className="flex justify-center mt-2">
      <span className="bg-foreground text-background text-xs px-3 py-2 rounded-full">
        {format(message.createdAt, "PPP")}
      </span>
    </div>
  );
};

const MessageSender = ({
  message,
  prevSenderId,
}: {
  prevSenderId: number | undefined;
  message: ChatMessage;
}) => {
  const userId = useUserId();
  const { data } = useCurrentChatDetails();

  const isSentByUser = message.sender.id === userId;
  const showSender =
    prevSenderId !== message.sender.id &&
    data?.chat?.type === "group" &&
    !isSentByUser;

  if (!showSender) return null;

  return (
    <div className="flex items-center gap-x-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={message.sender.picture ?? undefined} />
        <AvatarFallback>{message.sender.name}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-bold">{message.sender.name}</span>
    </div>
  );
};

const MessageAttachment = ({
  attachment,
}: {
  attachment: ChatMessageAttachment;
}) => {
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(attachment.url);
    toast.success("Link copied to clipboard");
  };

  return (
    <Card className="m-0 overflow-hidden p-0">
      <CardContent className="p-0">
        <div className="relative">
          {attachment.type === "image" ? (
            <div className="relative h-[200px] w-[200px]">
              <Image
                src={attachment.url}
                alt={`attachment-${attachment.name}`}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-[200px] w-[200px] flex-col items-center justify-center">
              <File className="text-muted-foreground h-12 w-12" />
            </div>
          )}
          <div className="bg-background/40 absolute right-0 bottom-0 left-0 p-2 backdrop-blur-md">
            <p className="text-foreground mb-2 truncate text-sm">
              {attachment.name}
            </p>
            <div className="justify flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a href={attachment.url} download={attachment.name}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MessageAttachments = ({ message }: { message: ChatMessage }) => {
  if (!message.attachments.length) return null;

  return (
    <div className="my-2 flex flex-wrap gap-3">
      {message.attachments.map((attachment) => (
        <MessageAttachment key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
};

const MessageReadReceipt = ({ message }: { message: ChatMessage }) => {
  const userId = useUserId();

  const isSentByUser = message.sender.id === userId;

  const receivedReceipts = message.readReceipnts.filter(
    (receipt) => receipt.receivedAt !== null
  );
  const readReceipts = message.readReceipnts.filter(
    (receipt) => receipt.readAt !== null
  );

  const isReceived = receivedReceipts.length > 0;
  const isRead = readReceipts.length > 0;

  if (!isSentByUser) return null;

  return (
    <div className="flex">
      {isReceived ? (
        <CheckCheck
          size="14"
          className={cn({
            "stroke-blue-600": isRead,
          })}
        />
      ) : (
        <Check size="14" />
      )}
    </div>
  );
};

const SendMessageContainer = () => {
  const { chatId } = useCurrentChat();

  const [messages, setMessages] = React.useState<Record<string, string>>({});
  const [attachments, setAttachments] = React.useState<
    Record<string, FileList | null>
  >({});
  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState(false);

  const currentChatMessage = chatId ? messages[chatId] || "" : "";
  const currentChatAttachments = chatId ? attachments[chatId] || null : null;

  if (!chatId) return null;

  const handleMessageChange = (callback: (prev: string) => string) => {
    if (!chatId) return;
    setMessages((prev) => ({
      ...prev,
      [chatId]: callback(prev[chatId] || ""),
    }));
  };

  const handleAttachmentsChange = (files: FileList | null) => {
    if (!chatId) return;
    setAttachments((prev) => ({
      ...prev,
      [chatId]: files,
    }));
  };

  const removeAttachment = (attachment: FileList, index: number) => {
    const filesArray = Array.from(attachment);
    filesArray.splice(index, 1);

    const dataTransfer = new DataTransfer();
    filesArray.forEach((file) => dataTransfer.items.add(file));

    setAttachments((prev) => ({
      ...prev,
      [chatId]: dataTransfer.files.length > 0 ? dataTransfer.files : null,
    }));
  };

  return (
    <div className="border-t p-4 relative ">
      <div className="absolute right-4 bottom-20">
        {emojiPickerOpen && (
          <Picker
            data={data}
            onEmojiSelect={(emoji: { native: string }) => {
              handleMessageChange((prev) => prev + emoji.native);
            }}
            onClickOutside={() => setEmojiPickerOpen(false)}
          />
        )}
      </div>

      {currentChatAttachments && currentChatAttachments.length > 0 && (
        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from(currentChatAttachments).map((file, index) => (
              <div
                key={index}
                className="group relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-gray-300 hover:shadow"
              >
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 z-10 h-6 w-6"
                  onClick={(e) => {
                    e.preventDefault();
                    removeAttachment(currentChatAttachments, index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-gray-50">
                  {file.type.startsWith("image") ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`attachment-${index}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 transition-colors group-hover:bg-gray-100">
                      <File className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p
                    className="truncate text-xs font-medium text-gray-700"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Input
          placeholder="Type your message..."
          value={currentChatMessage}
          onChange={(e) => handleMessageChange(() => e.target.value)}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="hover:cursor-pointer"
        >
          <Label>
            <Input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleAttachmentsChange(e.target.files)}
            />
            <Paperclip className="h-5 w-5" />
          </Label>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEmojiPickerOpen((prev) => !prev)}
        >
          <Smile className="h-5 w-5" />
        </Button>
        <Button>
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default CurrentChat;
