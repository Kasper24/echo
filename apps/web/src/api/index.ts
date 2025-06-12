import { isClientSide } from "../utils";
import {
  createTypiClient,
  type InferRouterInputs,
  type InferRouterOutputs,
} from "@repo/typiclient";
import type rootRouter from "@repo/api/router";

const api = createTypiClient<
  typeof rootRouter,
  {
    credentials: "include";
  }
>({
  baseUrl: "http://localhost:5000/api/v1",
  options: {
    credentials: "include",
  },
  baseHeaders: {
    Authorization: async () => {
      if (!isClientSide()) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        const accessToken = cookieStore.get("accessToken");
        return `Bearer ${accessToken?.value}`;
      }

      return "";
    },
    Cookie: async () => {
      if (!isClientSide()) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        const accessToken = cookieStore.get("accessToken");
        const refreshToken = cookieStore.get("refreshToken");
        return `accessToken=${accessToken?.value}; refreshToken=${refreshToken?.value}`;
      }

      return "";
    },
  },
  interceptors: {
    onResponse: [
      async ({ response, retry, path, config }) => {
        if (
          response.status === 401 &&
          path !== "/api/v1/auth/refresh-token" &&
          !config._retry
        ) {
          config._retry = true;
          await api.auth["refresh-token"].post();
          return await retry();
        }
      },
    ],
  },
});

export type ApiInputs = InferRouterInputs<typeof rootRouter>;
export type ApiOutputs = InferRouterOutputs<typeof rootRouter>;

export default api;
