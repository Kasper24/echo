import React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Phone,
  Shield,
  LogOut,
  Trash2,
  Camera,
  Edit3,
  Image,
  Activity,
  History,
  CheckCheck,
  PhoneCall,
  Send,
  AlignLeft,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@repo/ui/components/sheet";
import { Input } from "@repo/ui/components/input";
import { Button } from "@repo/ui/components/button";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Separator } from "@repo/ui/components/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/components/avatar";
import { cn } from "@repo/ui/lib/utils";
import useMediaQuery from "@repo/web/hooks/use-media-query";
import api, { ApiInputs } from "@repo/web/api";
import { useSettingsDrawer } from "../_providers/settings-drawer-provider";
import { useUser } from "../_hooks/user-provider";

type UpdateUser = ApiInputs["/user"]["/"]["patch"]["body"]["user"];
type UpdateUserPrivacySettings =
  ApiInputs["/user"]["/privacy"]["patch"]["body"]["privacySettings"];

const useMutateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: UpdateUser) => {
      await api.user[""].patch({
        input: {
          body: { user },
        },
        options: {
          throwOnErrorStatus: true,
        },
      });
    },
    onMutate: async (newUser) => {
      await queryClient.cancelQueries({ queryKey: ["user"] });
      const previousUser = queryClient.getQueryData(["user"]);
      queryClient.setQueryData(["user"], (oldData: UpdateUser) => ({
        ...oldData,
        ...newUser,
      }));
      return { previousUser };
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["user"], context?.previousUser);
      toast.error("Failed to update profile. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

const useQueryPrivacySettings = () => {
  return useQuery({
    queryKey: ["userPrivacySettings"],
    queryFn: async () => {
      const { data } = await api.user.privacy.get({
        options: {
          throwOnErrorStatus: true,
        },
      });
      return data;
    },
  });
};

const useMutatePrivacySettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (privacySettings: UpdateUserPrivacySettings) => {
      await api.user.privacy.patch({
        input: {
          body: { privacySettings },
        },
        options: {
          throwOnErrorStatus: true,
        },
      });
    },
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ["userPrivacySettings"] });
      const previousUserPrivacySettings = queryClient.getQueryData([
        "userPrivacySettings",
      ]);
      queryClient.setQueryData(
        ["userPrivacySettings"],
        (oldData: UpdateUserPrivacySettings) => ({
          ...oldData,
          ...newSettings,
        }),
      );
      return { previousUserPrivacySettings };
    },
    onSuccess: () => {
      toast.success("Privacy settings updated successfully!");
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        ["userPrivacySettings"],
        context?.previousUserPrivacySettings,
      );
      toast.error("Failed to update privacy settings. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userPrivacySettings"] });
    },
  });
};

const SettingsDrawer = () => {
  const { isMobile } = useMediaQuery();
  const { settingsOpen, setSettingsOpen } = useSettingsDrawer();

  return (
    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col w-full sm:max-w-md p-0 bg-card",
          isMobile && "h-[90vh] rounded-t-xl",
        )}
      >
        <Header />
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <ProfileSettings />
            <Separator />
            <PrivacySettings />
            <Separator />
            <AccountActions />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

const Header = () => {
  return (
    <SheetHeader className="p-4 border-b">
      <div className="flex items-center gap-2">
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </SheetClose>
        <SheetTitle className="text-left">Settings</SheetTitle>
      </div>
      <SheetDescription className="text-left mt-1">
        Manage your profile and privacy settings
      </SheetDescription>
    </SheetHeader>
  );
};

const ProfileSettings = () => {
  const { data } = useUser();
  const [editingProfile, setEditingProfile] = React.useState(false);
  const [tempProfile, setTempProfile] = React.useState<{
    name: string;
    description: string;
    picture?: File | undefined;
  }>({
    name: "",
    description: "",
    picture: undefined,
  });
  React.useEffect(() => {
    if (data?.user) {
      setTempProfile({
        name: data.user.name ?? "",
        description: data.user.description ?? "",
        picture: undefined,
      });
    }
  }, [data]);
  const updateUser = useMutateUser();

  const handleSaveProfile = () => {
    setEditingProfile(false);
    updateUser.mutate(tempProfile);
  };

  const handleCancelEdit = () => {
    setTempProfile({
      name: data?.user.name || "",
      description: data?.user.description || "",
      picture: undefined,
    });
    setEditingProfile(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="size-5" />
          Profile
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingProfile(!editingProfile)}
            title={editingProfile ? "Cancel editing profile" : "Edit profile"}
          >
            <Edit3 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarImage
              src={
                tempProfile.picture
                  ? URL.createObjectURL(tempProfile.picture)
                  : (data?.user.picture ?? undefined)
              }
            />
            <AvatarFallback>{data?.user.name}</AvatarFallback>
          </Avatar>
          {editingProfile && (
            <Button
              variant="secondary"
              size="icon"
              asChild
              className="hover:cursor-pointer absolute -bottom-1 -right-1 h-6 w-6 rounded-full"
            >
              <Label>
                <Input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files?.length) return;
                    const file = e.target.files[0];
                    setTempProfile((prev) => ({
                      ...prev,
                      picture: file,
                    }));
                  }}
                  accept="image/*"
                />
                <Camera className="h-3 w-3" />
              </Label>
            </Button>
          )}
        </div>
        <div className="flex-1">
          {editingProfile ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={tempProfile.name}
                onChange={(e) =>
                  setTempProfile((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Your name"
              />
            </div>
          ) : (
            <div>
              <p className="font-medium">{data?.user.name}</p>
              <p className="text-sm text-muted-foreground">
                {data?.user.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {editingProfile && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">About</Label>
            <Textarea
              id="description"
              value={tempProfile.description}
              onChange={(e) =>
                setTempProfile((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Tell people about yourself"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveProfile} className="flex-1">
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!editingProfile && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{data?.user.phoneNumber}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const LogoutDialog = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: async () => {
      await api.auth.logout.post({
        options: {
          throwOnErrorStatus: true,
        },
      });
    },
    onSuccess: () => {
      toast.success("Logged out successfully!");
      router.refresh();
      queryClient.clear();
    },
    onError: () => {
      // toast.error("Failed to logout. Please try again.");
    },
  });

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Logout</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to logout?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => logout.mutate()}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Logout
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
};

const DeleteAccountDialog = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteAccount = useMutation({
    mutationFn: async () => {
      await api.user[""].delete({
        options: {
          throwOnErrorStatus: true,
        },
      });
    },
    onSuccess: () => {
      toast.success("Account deleted successfully!");
      router.refresh();
      queryClient.clear();
    },
    onError: () => {
      toast.error("Failed to delete account. Please try again.");
    },
  });

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Account</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete your account? This action cannot be
          undone. All your messages, contacts, and data will be permanently
          removed.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => deleteAccount.mutate()}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          Delete Account
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
};

const PrivacySettings = () => {
  const { isPending, isError, data } = useQueryPrivacySettings();
  const updateUserPrivacySettings = useMutatePrivacySettings();

  if (isPending) return <div>Loading...</div>;
  if (isError) return <div>Error loading privacy settings</div>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Privacy
      </h3>

      <div className="space-y-4">
        <PrivacySettingSelect
          icon={Image}
          label="Profile Photo"
          description="Who can see your profile photo"
          value={data.privacySettings.showPicture}
          onValueChange={(value) =>
            updateUserPrivacySettings.mutate({
              showPicture: value,
            })
          }
        />
        <PrivacySettingSelect
          icon={AlignLeft}
          label="Description"
          description="Who can see your description"
          value={data.privacySettings.showDescription}
          onValueChange={(value) =>
            updateUserPrivacySettings.mutate({
              showDescription: value,
            })
          }
        />
        <PrivacySettingSelect
          icon={Activity}
          label="Online Status"
          description="Who can see your online status"
          value={data.privacySettings.showStatus}
          onValueChange={(value) =>
            updateUserPrivacySettings.mutate({
              showStatus: value,
            })
          }
        />
        <PrivacySettingSelect
          icon={History}
          label="Last Seen"
          description="Who can see when you were last online"
          value={data.privacySettings.showLastSeen}
          onValueChange={(value) =>
            updateUserPrivacySettings.mutate({
              showLastSeen: value,
            })
          }
        />
        <PrivacySettingSelect
          icon={CheckCheck}
          label="Read Receipts"
          description="Who can see when you read messages"
          value={data.privacySettings.showReadReceipts}
          onValueChange={(value) =>
            updateUserPrivacySettings.mutate({
              showReadReceipts: value,
            })
          }
        />
        <PrivacySettingSelect
          icon={PhoneCall}
          label="Calls"
          description="Who can call you"
          value={data.privacySettings.allowCalls}
          onValueChange={(value) =>
            updateUserPrivacySettings.mutate({
              allowCalls: value,
            })
          }
        />
        <PrivacySettingSelect
          icon={Send}
          label="Messages"
          description="Who can send you messages"
          value={data.privacySettings.allowMessages}
          onValueChange={(value) =>
            updateUserPrivacySettings.mutate({
              allowMessages: value,
            })
          }
        />
      </div>
    </div>
  );
};

const PrivacySettingSelect = ({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  value: "everyone" | "contacts" | "nobody";
  onValueChange: (value: "everyone" | "contacts" | "nobody") => void;
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {React.createElement(icon, {
          className: "h-4 w-4 text-muted-foreground",
        })}
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="everyone">Everyone</SelectItem>
          <SelectItem value="contacts">Contacts</SelectItem>
          <SelectItem value="nobody">Nobody</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

const AccountActions = () => {
  return (
    <div className="flex gap-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" title="Logout" className="flex-1">
            <LogOut className="size-4" />
            Logout
          </Button>
        </AlertDialogTrigger>
        <LogoutDialog />
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            title="Delete account"
            className="flex-1"
          >
            <Trash2 className="size-4" />
            Delete Account
          </Button>
        </AlertDialogTrigger>
        <DeleteAccountDialog />
      </AlertDialog>
    </div>
  );
};

export default SettingsDrawer;
