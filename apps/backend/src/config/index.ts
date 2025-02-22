import { z, ZodError } from "zod";

const environmentVariableSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(["development", "test", "production"]),

  PORT: z.coerce.number().positive().int().default(5000),
  // PORT: z.number().positive().int().default(5000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Postgres
  POSTGRES_URL: z.string().optional(),
  POSTGRES_HOST: z.string().trim().min(1).default("localhost"),
  POSTGRES_PORT: z.coerce.number().positive().int().default(5432),
  POSTGRES_DATABASE: z.string().trim().min(1).default("echo"),
  POSTGRES_USER: z.string().trim().min(1).default("echo"),
  POSTGRES_PASSWORD: z.string().trim().min(1).default("echo"),
  POSTGRES_POOL_MAX_SIZE: z.coerce.number().gte(1).optional(),
  POSTGRES_IDLE_TIMEOUT_IN_MS: z.coerce.number().gte(1000).optional(),
  POSTGRES_CONN_TIMEOUT_IN_MS: z.coerce.number().gte(1000).optional(),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().trim().min(1).default("localhost"),
  REDIS_PORT: z.coerce.number().positive().int().default(6379),
  REDIS_USER: z.string().optional().default("echo"),
  REDIS_PASSWORD: z.string().optional().default("echo"),
  REDIS_SECRET: z.string().optional(),
  REDIS_MAX_CONNECTION_RETRY: z.coerce.number().positive().int().optional(),
  REDIS_MIN_CONNECTION_DELAY_IN_MS: z.coerce
    .number()
    .positive()
    .int()
    .optional(),
  REDIS_MAX_CONNECTION_DELAY_IN_MS: z.coerce
    .number()
    .positive()
    .int()
    .optional(),

  //JWT
  JWT_KEY: z.string().trim().min(1).default("jwt"),
  JWT_REFRESH_TOKEN_SECRET: z.string().trim().min(1).default("secret"),
  JWT_ACCESS_TOKEN_SECRET: z.string().trim().min(1).default("secret"),
  JWT_ACCESS_TOKEN_EXPIRY: z
    .string()
    .regex(
      /^\d+[smhd]$/,
      "Invalid JWT expiry format. Use formats like '15m', '1h', '7d'."
    )
    .transform((val) => val as `${number}${"s" | "m" | "h" | "d"}`)
    .default("15m"),
  JWT_REFRESH_TOKEN_EXPIRY: z
    .string()
    .regex(
      /^\d+[smhd]$/,
      "Invalid JWT expiry format. Use formats like '15m', '1h', '7d'."
    )
    .transform((val) => val as `${number}${"s" | "m" | "h" | "d"}`)
    .default("7d"),
  JWT_REFRESH_TOKEN_MAX_AGE: z.coerce.number().default(7 * 24 * 60 * 60 * 1000),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),

  // Rate limit
  WINDOW_SIZE_IN_MINUTES: z.coerce.number().positive().int().default(15),
  MAX_NUMBER_OF_REQUESTS_PER_WINDOW_SIZE: z.coerce
    .number()
    .positive()
    .int()
    .default(100),
});

const envValidate = () => {
  try {
    environmentVariableSchema.parse(process.env);
  } catch (error) {
    if (error instanceof ZodError) console.error(error.errors);
    process.exit(1);
  }
};

type EnvSchemaType = z.infer<typeof environmentVariableSchema>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ProcessEnv extends EnvSchemaType {}
  }
}

export default envValidate;
