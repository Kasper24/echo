import z from "zod";
import { isClientSide } from ".";

type HttpMethod =
  | "GET"
  | "HEAD"
  | "OPTIONS"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH";

type RequestFormat =
  | "json" // default
  | "form-data" // for file uploads
  | "form-url" // for hiding query params in the body
  | "binary" // for binary data / file uploads
  | "text"; // for text data

// prettier-ignore
type HttpStatusCode =
  | 100 | 101 | 102 | 103
  | 200 | 201 | 202 | 203 | 204 | 205 | 206
  | 300 | 301 | 302 | 303 | 304 | 305 | 307 | 308
  | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421 | 422 | 423 | 424 | 425 | 426 | 427 | 428 | 429 | 430 | 431 | 451
  | 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;

interface Route {
  description?: string;
  path: string;
  method: HttpMethod;
  requestFormat?: RequestFormat;
  params?: {
    body?: z.ZodObject<Record<string, z.ZodType>>;
    pathParams?: z.ZodObject<Record<string, z.ZodType>>;
    query?: z.ZodObject<Record<string, z.ZodType>>;
    headers?: z.ZodObject<Record<string, z.ZodType>>;
  };
  responses: Partial<Record<HttpStatusCode, z.ZodType>>;
}

type Routes = Record<string, Route>;

type BaseHeaders = Record<string, string | (() => string | Promise<string>)>;

type ExtractParam<T, K extends keyof NonNullable<T>> =
  T extends Record<K, infer P>
    ? P extends z.ZodType
      ? z.infer<P>
      : undefined
    : undefined;

type RouteParams<T extends Route> = {
  body: ExtractParam<T["params"], "body">;
  pathParams: ExtractParam<T["params"], "pathParams">;
  query: ExtractParam<T["params"], "query">;
  headers: ExtractParam<T["params"], "headers">;
} extends infer R
  ? { [K in keyof R as R[K] extends undefined ? never : K]: R[K] } & Partial<R>
  : never;

type StatusCodes<T extends Route> = Extract<
  keyof T["responses"],
  HttpStatusCode
>;

type StatusResponse<T extends Route, S extends StatusCodes<T>> = z.infer<
  NonNullable<T["responses"][S]>
>;

type ApiResponse<T extends Route> = {
  [S in StatusCodes<T>]: Promise<[S, StatusResponse<T, S>]>;
}[StatusCodes<T>];

type ApiInstance<T extends Record<string, Route>> = Api & {
  [K in keyof T]: (params?: RouteParams<T[K]>) => ApiResponse<T[K]>;
};

class Api {
  private baseUrl: string;
  private baseHeaders: BaseHeaders;
  public routes: Record<string, Route>;

  constructor(
    baseUrl: string,
    headers: BaseHeaders,
    routes: Record<string, Route> = {},
  ) {
    this.baseUrl = baseUrl;
    this.baseHeaders = headers;
    this.routes = routes;

    Object.entries(this.routes).forEach(([key, route]) => {
      Object.defineProperty(this, key, {
        value: async (params?: RouteParams<typeof route>) =>
          await this.executeRequest(route, params),
        writable: false,
      });
    });
  }

  private async executeRequest<T extends Route>(
    route: T,
    params?: RouteParams<T>,
    // @ts-expect-error - TypeScript doesn't know that the response is valid
  ): ApiResponse<T> {
    let url = new URL(route.path, this.baseUrl);

    // Handle path parameters
    if (route.params?.pathParams && params?.pathParams) {
      let path = route.path;
      const validatedPathParams = route.params.pathParams.parse(
        params.pathParams,
      );

      Object.entries(validatedPathParams).forEach(([key, value]) => {
        path = path.replace(`:${key}`, String(value));
      });

      url = new URL(path, this.baseUrl);
    }

    // Handle query parameters
    if (route.params?.query && params?.query) {
      const validatedQueryParams = route.params.query.parse(params.query);

      Object.entries(validatedQueryParams).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    // Prepare headers
    let contentType = "";
    switch (route.requestFormat) {
      case "json":
        contentType = "application/json";
        break;
      case "form-data":
        contentType = "multipart/form-data";
        break;
      case "form-url":
        contentType = "application/x-www-form-urlencoded";
        break;
      case "binary":
        contentType = "application/octet-stream";
        break;
      case "text":
        contentType = route.requestFormat;
        break;
      default:
        contentType = "application/json";
    }
    let headers: Record<string, string> = {
      "Content-Type": contentType,
    };

    if (this.baseHeaders) {
      const headerEntries = await Promise.all(
        Object.entries(this.baseHeaders).map(
          async ([name, valueOrFunction]) => {
            if (typeof valueOrFunction === "function") {
              const result = valueOrFunction();
              const value = result instanceof Promise ? await result : result;
              return [name, value];
            } else {
              return [name, valueOrFunction];
            }
          },
        ),
      );

      headers = { ...headers, ...Object.fromEntries(headerEntries) };
    }

    if (route.params?.headers && params?.headers) {
      const validatedHeaders = route.params.headers.parse(params.headers);
      headers = { "Content-Type": contentType, ...validatedHeaders };
    }

    let body: BodyInit | undefined;
    if (route.params?.body && params?.body) {
      const validatedBody = route.params.body.parse(params.body);

      switch (route.requestFormat) {
        case "form-data": {
          const formData = new FormData();
          Object.entries(validatedBody).forEach(([key, value]) => {
            formData.append(key, value);
          });
          body = formData;
          break;
        }
        case "form-url":
          body = new URLSearchParams(
            validatedBody as Record<string, string>,
          ).toString();
          break;
        case "binary":
        case "text":
          body = validatedBody as any;
          break;
        default:
          body = JSON.stringify(validatedBody);
      }
    }

    // Make the request
    const response = await fetch(url.toString(), {
      method: route.method,
      headers,
      body,
      credentials: "include",
    });
    const status = response.status as StatusCodes<T>;
    const data = await response.json();

    const schema = route.responses[status];
    if (!schema) {
      throw new Error(`Unexpected status code: ${status}`);
    }

    try {
      console.log("Raw response data:", data);
      const parsedData = schema.parse(data) as StatusResponse<
        T,
        typeof status & StatusCodes<T>
      >;
      return Promise.resolve([status, parsedData]) as ApiResponse<T>;
    } catch (error) {
      console.error("Schema validation failed:", error);
      throw new Error(`Failed to parse response for status ${status}`);
    }

    // const parsedData = schema.parse(data) as StatusResponse<
    //   T,
    //   typeof status & StatusCodes<T>
    // >;

    console.log(data);

    return Promise.resolve([status, data]) as ApiResponse<T>;
  }
}

export function createApi<T extends Routes>({
  baseUrl,
  baseHeaders,
  routes,
}: {
  baseUrl: string;
  baseHeaders: BaseHeaders;
  routes: T;
}): ApiInstance<T> {
  return new Api(baseUrl, baseHeaders, routes) as ApiInstance<T>;
}

const errorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

const errorsSchemas = (auth: boolean) => {
  return {
    400: errorSchema,
    401: auth ? errorSchema : undefined,
    429: errorSchema,
    500: errorSchema,
  };
};

const userSchema = {
  id: z.number(),
  phoneNumber: z.string(),
  name: z.string(),
  picture: z.string(),
  description: z.string(),
  status: z.boolean(),
  lastSeen: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
};

const chatSchema = {
  id: z.number(),
  type: z.string(),
  name: z.string(),
  picture: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  isBlocked: z.boolean().optional(),
};

const chatParticipantSchema = {
  id: z.number(),
  chatId: z.number(),
  userId: z.number(),
  role: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
};

const messageSchema = {
  id: z.number(),
  chatId: z.number(),
  senderId: z.number(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
};

const messageAttachmentSchema = {
  id: z.number(),
  messageId: z.number(),
  type: z.string(),
  name: z.string(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
};

const messageReadReceiptSchema = {
  id: z.number(),
  chatId: z.number(),
  messageId: z.number(),
  userId: z.number(),
  receivedAt: z.string().nullable(),
  readAt: z.string().nullable(),
};

const blockSchema = {
  id: z.number(),
  blockerId: z.number(),
  blockedId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
};

const paginationSchema = {
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
  prevPage: z.number().nullable(),
  nextPage: z.number().nullable(),
  hasPrev: z.boolean(),
  hasNext: z.boolean(),
};

const api = createApi({
  baseUrl: "http://localhost:5000",
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
  routes: {
    healthcheck: {
      method: "GET",
      path: "/healthcheck",
      responses: {
        200: z.object({
          message: z.string(),
          uptime: z.string(),
          timestamp: z.string(),
        }),
        ...errorsSchemas(false),
      },
    },

    otpSend: {
      method: "POST",
      path: "/api/v1/auth/otp/send",
      params: {
        body: z.object({
          phoneNumber: z.string(),
        }),
      },
      responses: {
        200: z.object({
          message: z.string(),
        }),
        ...errorsSchemas(false),
      },
    },

    otpStatus: {
      method: "POST",
      path: "/api/v1/auth/otp/status",
      params: {
        body: z.object({
          phoneNumber: z.string(),
        }),
      },
      responses: {
        200: z.object({
          message: z.string(),
        }),
        ...errorsSchemas(false),
      },
    },

    otpVerify: {
      method: "POST",
      path: "/api/v1/auth/otp/verify",
      params: {
        body: z.object({
          phoneNumber: z.string(),
          otp: z.string(),
        }),
      },
      responses: {
        201: z.object({}),
        ...errorsSchemas(false),
      },
    },

    refreshToken: {
      method: "GET",
      path: "/api/v1/auth/refresh-token",
      responses: {
        200: z.object({
          accessToken: z.string(),
        }),
        ...errorsSchemas(true),
      },
    },

    logout: {
      method: "GET",
      path: "/api/v1/auth/logout",
      responses: {
        200: z.object({
          message: z.string(),
        }),
        ...errorsSchemas(true),
      },
    },

    getChats: {
      method: "GET",
      path: "/api/v1/chat",
      responses: {
        200: z.object({
          chats: z.array(
            z.object({
              ...chatSchema,
              latestMessage: z.object({
                ...messageSchema,
                sender: z.object({
                  ...userSchema,
                }),
              }),
              unreadMessagesCount: z.number(),
            }),
          ),
        }),
        ...errorsSchemas(true),
      },
    },

    getChatDetails: {
      method: "GET",
      path: "/api/v1/chat/:chatId",
      params: {
        pathParams: z.object({
          chatId: z.number(),
        }),
      },
      responses: {
        200: z.object({
          ...chatSchema,
          chatParticipants: z.array(
            z.object({
              ...chatParticipantSchema,
              user: z.object({
                ...userSchema,
              }),
            }),
          ),
        }),
        ...errorsSchemas(true),
      },
    },

    getChatMessages: {
      method: "GET",
      path: "/api/v1/chat/:chatId/messages",
      params: {
        pathParams: z.object({
          chatId: z.number(),
        }),
        query: z.object({
          page: z.number(),
          limit: z.number(),
        }),
      },
      responses: {
        200: z.object({
          data: z.array(
            z.object({
              ...messageSchema,
              readReceipnts: z.array(
                z.object({
                  ...messageReadReceiptSchema,
                }),
              ),
              sender: z.object({
                ...userSchema,
              }),
              attachments: z.array(
                z.object({
                  ...messageAttachmentSchema,
                }),
              ),
            }),
          ),
          pagination: z.object({
            ...paginationSchema,
          }),
        }),
        ...errorsSchemas(true),
      },
    },

    getFriends: {
      method: "GET",
      path: "/api/v1/friends",
      responses: {
        200: z.object({
          acceptedFriends: z.array(
            z.object({
              id: z.number(),
              phoneNumber: z.string(),
            }),
          ),
          friendsRequestsSent: z.array(
            z.object({
              id: z.number(),
              phoneNumber: z.string(),
            }),
          ),
          friendsRequestsReceived: z.array(
            z.object({
              id: z.number(),
              phoneNumber: z.string(),
            }),
          ),
        }),
        ...errorsSchemas(true),
      },
    },

    sendFriendRequest: {
      method: "POST",
      path: "/api/v1/friends/:friendId",
      params: {
        pathParams: z.object({
          friendId: z.number(),
        }),
      },
      responses: {
        200: z.object({
          message: z.string(),
        }),
        ...errorsSchemas(true),
      },
    },

    acceptFriendRequest: {
      method: "POST",
      path: "/api/v1/friends/:friendId/accept",
      params: {
        pathParams: z.object({
          friendId: z.number(),
        }),
      },
      responses: {
        200: z.object({
          message: z.string(),
        }),
        ...errorsSchemas(true),
      },
    },

    denyFriendRequest: {
      method: "POST",
      path: "/api/v1/friends/:friendId/deny",
      params: {
        pathParams: z.object({
          friendId: z.number(),
        }),
      },
      responses: {
        200: z.object({
          message: z.string(),
        }),
        ...errorsSchemas(true),
      },
    },

    getUser: {
      method: "GET",
      path: "/api/v1/user",
      responses: {
        200: z.object({
          user: z.object({
            ...userSchema,
          }),
        }),
        ...errorsSchemas(true),
      },
    },

    updateUser: {
      method: "PATCH",
      path: "/api/v1/user",
      params: {
        body: z.object({
          updatedUser: z.object({
            name: z.string().optional(),
            picture: z.string().optional(),
            description: z.string().optional(),
          }),
        }),
      },
      responses: {
        200: z.object({
          user: z.object({
            ...userSchema,
          }),
        }),
        ...errorsSchemas(true),
      },
    },

    getBlockedUsers: {
      method: "GET",
      path: "/api/v1/block",
      responses: {
        200: z.object({
          blockedUsers: z.array(
            z.object({
              ...blockSchema,
            }),
          ),
        }),
        ...errorsSchemas(true),
      },
    },

    blockUser: {
      method: "POST",
      path: "/api/v1/block/:userId",
      params: {
        pathParams: z.object({
          userId: z.number(),
        }),
      },
      responses: {
        200: z.object({
          message: z.string(),
        }),
        ...errorsSchemas(true),
      },
    },

    unblockUser: {
      method: "DELETE",
      path: "/api/v1/block/:userId",
      params: {
        pathParams: z.object({
          userId: z.number(),
        }),
      },
      responses: {
        200: z.object({
          message: z.string(),
        }),
        ...errorsSchemas(true),
      },
    },
  },
});

api.healthcheck();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferResponse<T extends (...args: any) => any> =
  Exclude<
    Awaited<ReturnType<T>>[1],
    { message: string; error: string }
  > extends infer R
    ? R extends { data: Array<infer Item> }
      ? Item
      : R
    : never;

export type ChatMessage = InferResponse<typeof api.getChatMessages>;
export type ChatMessageAttachment = ChatMessage["attachments"][number];

export default api;
