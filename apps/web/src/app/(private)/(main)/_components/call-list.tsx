"use client";

import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneMissed,
  Clock,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "date-fns";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import api, { ApiOutputs } from "@repo/web/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/components/button";
import { useSearch } from "../_providers/search-provider";

type Call = ApiOutputs["/call"]["/"]["get"]["calls"][number];

const CallList = () => {
  const { searchQuery } = useSearch();
  const { isPending, isError, data } = useQuery({
    queryKey: ["calls"],
    queryFn: async () => {
      const { data } = await api.call[""].get({
        options: {
          throwOnErrorStatus: true,
        },
      });
      return data;
    },
  });

  if (isPending) {
    return <p>Loading...</p>;
  }

  if (isError) {
    return <p>Error</p>;
  }

  const filteredCalls = searchQuery.trim()
    ? data.calls.filter((call) =>
        call.participants.some((p) =>
          p.user.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : data.calls;

  return (
    <ScrollArea className="h-[calc(100vh-190px)]">
      {filteredCalls.map((call, index) => {
        return (
          <div key={call.call.id} className="p-4">
            <DateDivider call={call} prevCall={data.calls[index - 1]} />
            <Call call={call} />
          </div>
        );
      })}
    </ScrollArea>
  );
};

const Call = ({ call }: { call: Call }) => {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 justify-between">
        <CallParticipants call={call} />
      </div>
      <div className="flex items-center justify-between">
        <CallStatus call={call} />
        <CallButtons call={call} />
      </div>
    </div>
  );
};

const DateDivider = ({
  call,
  prevCall,
}: {
  call: Call;
  prevCall: Call | undefined;
}) => {
  const showDate =
    prevCall?.self.joinedAt?.toDateString() !==
    call.self.joinedAt!.toDateString();

  if (!showDate) return null;

  return (
    <span className="font-medium text-muted-foreground text-sm">
      {formatDate(call.self.joinedAt!, "PPP")}
    </span>
  );
};

const CallParticipants = ({ call }: { call: Call }) => {
  const displayParticipants = call.participants.slice(0, 3);
  const remainingCount = call.participants.length - 3;

  return call.participants && call.participants.length > 1 ? (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {displayParticipants.map((participant) => {
          return (
            <Avatar className="size-8" key={participant.user.id}>
              <AvatarImage src={participant.user.picture ?? undefined} />
              <AvatarFallback>{participant.user.name}</AvatarFallback>
            </Avatar>
          );
        })}
        {remainingCount > 0 && (
          <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-medium">
              +{remainingCount}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">
          {call.participants.length === 2
            ? call.participants.map((p) => p.user.name).join(", ")
            : `${call.participants[0].user.name} and ${call.participants.length - 1} others`}
        </span>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Avatar className="size-8">
        <AvatarImage src={call.participants[0].user.picture ?? undefined} />
        <AvatarFallback>{call.participants[0].user.name}</AvatarFallback>
      </Avatar>
      <span className="font-medium">{call.participants[0].user.name}</span>
    </div>
  );
};

const CallStatus = ({ call }: { call: Call }) => {
  return (
    <div className="flex items-center gap-2">
      <CallIcon call={call} />
      <span
        className={cn(
          "text-sm capitalize",
          call.call.status === "missed"
            ? "text-red-600"
            : "text-muted-foreground"
        )}
      >
        {call.call.status}
      </span>
      {call.call.duration && (
        <>
          <span className="text-muted-foreground">•</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {call.call.duration}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

const CallIcon = ({ call }: { call: Call }) => {
  if (call.call.status === "ringing")
    return <PhoneIncoming className="h-4 w-4 text-green-500" />;

  if (call.call.status === "missed" || call.call.status === "declined")
    return <PhoneMissed className="h-4 w-4 text-red-500" />;

  return <Phone className="h-4 w-4 text-gray-500" />;
};

const CallButtons = ({ call }: { call: Call }) => {
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <Phone className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7">
        <Video className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default CallList;
