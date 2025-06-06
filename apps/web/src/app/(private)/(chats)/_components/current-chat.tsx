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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/components/drawer";
import api, { type ApiOutputs } from "@repo/web/api";
import { useCurrentChat } from "@repo/web/app/(private)/_providers/current-chat-provider";
import { useInView } from "react-intersection-observer";

type ChatMessage =
  ApiOutputs["/chat"]["/:chatId/messages"]["get"]["data"][number];
type ChatMessageAttachment =
  ApiOutputs["/chat"]["/:chatId/messages"]["get"]["data"][number]["attachments"][number];

const CurrentChat = () => {
  const { status, fetchStatus, error, isLoading } = useCurrentChatDetails();

  if (status === "pending" && fetchStatus === "idle")
    return (
      <div className="flex h-full w-full items-center justify-center">
        Maybe select a chat first?
      </div>
    );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="flex h-full w-full flex-col">
      <ChatHeader />
      <MessagesList />
      <SendMessageContainer />
    </div>
  );
};

const useCurrentChatDetails = () => {
  const { chatId } = useCurrentChat();
  return useQuery({
    queryKey: ["chatDetails", chatId],
    enabled: chatId !== null,
    queryFn: async () => {
      const { status, data } = await api.chat[":chatId"].get({
        path: {
          chatId: chatId!.toString(),
        },
      });

      if (status === "OK") return data;
      throw new Error(data.error.message);
    },
  });
};

const useToggleBlockUser = () => {
  const { chatId } = useCurrentChat();
  const { data } = useCurrentChatDetails();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!data || !data.otherUser) return;
      await api.block[":userId"][data.otherUser.isBlocked ? "delete" : "post"]({
        path: {
          userId: data.otherUser.id.toString(),
        },
      });
    },
    // When mutate is called:
    onMutate: async () => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["chatDetails", chatId] });

      // Snapshot the previous value
      const previousIsBlocked = data?.otherUser?.isBlocked;

      // Optimistically update to the new value
      queryClient.setQueryData(["chatDetails", chatId], () => ({
        ...data,
        otherUser: {
          ...data!.otherUser,
          isBlocked: !data!.otherUser!.isBlocked,
        },
      }));

      // Return a context object with the snapshotted value
      return { previousIsBlocked };
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    onError: (err, newIsBlocked, context) => {
      queryClient.setQueryData(
        ["chatDetails", chatId],
        context?.previousIsBlocked
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chatDetails", chatId] });
    },
  });
};

const useUser = () => {
  const { data } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { status, data } = await api.user[""].get();
      if (status === "OK") return data;
      throw new Error(data.error.message);
    },
  });

  return {
    userId: data?.id ?? null,
  };
};

const ChatHeader = () => {
  const { data, isPending, isError } = useCurrentChatDetails();

  if (isPending) return null;
  if (isError) return null;

  if (!data) return null;

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center space-x-4">
        <Avatar>
          <AvatarImage src={data.picture ?? undefined} />
          <AvatarFallback>{data.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-sm font-medium">{data.name}</h2>
          {data?.type === "direct" && (
            <p className="text-xs text-muted-foreground">
              {data.otherUser.status
                ? "Online"
                : `Last seen ${formatDistanceToNow(data.otherUser.lastSeen, {
                    addSuffix: true,
                  })}`}
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

  if (!data || data.type !== "direct") return null;

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
                {data.picture && (
                  <Image
                    src={data.picture}
                    alt={data.name}
                    fill
                    className="object-contain"
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {data.picture && (
                <Image
                  src={data.picture}
                  alt={data.name}
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
          <DialogTitle className="text-2xl font-bold">{data.name}</DialogTitle>
          <div className="text-sm text-muted-foreground">
            {data.otherUser?.status ? (
              <span className="text-green-500">Online</span>
            ) : data.otherUser.lastSeen ? (
              `Last seen ${formatDistanceToNow(data.otherUser.lastSeen, { addSuffix: true })}`
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
              <p>{data.otherUser.phoneNumber || "Not available"}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Status
              </h3>
              <p>{data.otherUser.status || "No status"}</p>
            </div>

            <div className="pt-4">
              <Button
                variant={data.otherUser.isBlocked ? "default" : "destructive"}
                className="w-full"
                onClick={() => toggleBlockUser.mutate()}
              >
                {data.otherUser.isBlocked ? "Unblock" : "Block"}{" "}
                {data.otherUser.name}
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
                {data.picture && (
                  <Image
                    src={data.picture}
                    alt={data.name}
                    fill
                    className="object-contain"
                  />
                )}
              </div>
            </div>
          ) : (
            <>
              {data.picture && (
                <Image
                  src={data.picture}
                  alt={data.name}
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
          <DialogTitle className="text-2xl font-bold">{data.name}</DialogTitle>
          <div className="text-sm text-muted-foreground">
            {data.chatParticipants.length} participants
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
              <p>{data.description}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Created
              </h3>
              <p>{format(data.createdAt, "PPP")}</p>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                <h3 className="text-sm font-medium">
                  {data.chatParticipants.length} Participants
                </h3>
              </div>
              <Button size="sm" variant="outline" className="h-8">
                <PlusCircle className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-4">
              {data.chatParticipants.map((member) => (
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
  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Are you absolutely sure?</DrawerTitle>
        <DrawerDescription>This action cannot be undone.</DrawerDescription>
      </DrawerHeader>
      <DrawerFooter>
        <Button>Submit</Button>
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
};

const ChatDropdown = () => {
  const { data } = useCurrentChatDetails();
  const toggleBlockUser = useToggleBlockUser();

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
        <Drawer direction="right">
          <DrawerTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              Search Messages
            </DropdownMenuItem>
          </DrawerTrigger>
          <SearchMessagesDrawer />
        </Drawer>
        <Dialog>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              {data.type === "group" ? "View info" : "View profile"}
            </DropdownMenuItem>
          </DialogTrigger>
          {data.type === "group" ? <GroupDialog /> : <ProfileDialog />}
        </Dialog>
        {data.type === "direct" && (
          <div>
            <DropdownMenuItem>Add Friend</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleBlockUser.mutate()}>
              {data.otherUser.isBlocked ? "Unblock User" : "Block User"}
            </DropdownMenuItem>
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          {data.type === "group" ? "Leave Group" : "Delete Chat"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MessagesList = () => {
  const { userId } = useUser();
  const { chatId } = useCurrentChat();
  const { data, fetchNextPage } = useInfiniteQuery({
    queryKey: ["chatMessages", chatId],
    enabled: chatId !== null,
    queryFn: async ({ pageParam }) => {
      const { status, data } = await api.chat[":chatId/messages"].get({
        path: { chatId: chatId!.toString() },
        query: { page: pageParam, limit: 50 },
      });

      if (status === "OK") return data;
      throw new Error(data.error.message);
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
    () => data?.pages.flatMap((page) => page.data).reverse(),
    [data]
  );

  return (
    <ScrollArea
      className="min-h-0 grow"
      scrollTo={(scrollArea) => ({
        top: scrollArea.scrollHeight,
        behavior: "instant",
      })}
    >
      <div ref={ref} className="h-5 w-1 bg-red-600"></div>
      {allMessages?.map((message, index, messages) => {
        const isSentByUser = message.sender.id === userId;

        const previous = index > 0 ? messages[index - 1] : null;
        const prevSenderId = previous?.sender.id;
        const prevDate = previous ? previous?.createdAt : undefined;

        return (
          <div key={message.id}>
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
              <p className="text-sm">{message.content}</p>
              <MessageAttachments message={message} />
              <div className="flex items-center justify-between">
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
    <div className="flex justify-center">
      <span className="bg-foreground text-background rounded-md p-2 text-xs font-light">
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
  const { userId } = useUser();
  const { data: chatData } = useCurrentChatDetails();

  const isSentByUser = message.sender.id === userId;
  const showSender =
    prevSenderId !== message.sender.id &&
    chatData?.type === "group" &&
    !isSentByUser;

  if (!showSender) return null;

  return (
    <div className="flex items-center gap-x-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={message.sender.picture ?? undefined} />
        <AvatarFallback>EL</AvatarFallback>
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
  const { userId } = useUser();

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
