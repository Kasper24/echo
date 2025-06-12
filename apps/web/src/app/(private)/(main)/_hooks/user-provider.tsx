import { useQuery } from "@tanstack/react-query";
import api from "@repo/web/api";

const useUser = () => {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const {  data } = await api.user[""].get({
        options: {
          throwOnErrorStatus: true,
        },
      });
      return data;
    },
  });
};

const useUserId = () => {
  const { data } = useUser();
  return data?.user.id ?? null;
};

export { useUser, useUserId };
