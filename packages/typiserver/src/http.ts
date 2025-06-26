export type HttpMethod =
  | "all"
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "options"
  | "head";

const HttpStatus = [
  { key: "CONTINUE", code: 100, label: "Continue" },
  { key: "SWITCHING_PROTOCOLS", code: 101, label: "Switching Protocols" },
  { key: "PROCESSING", code: 102, label: "Processing" },
  { key: "EARLY_HINTS", code: 103, label: "Early Hints" },
  { key: "OK", code: 200, label: "OK" },
  { key: "CREATED", code: 201, label: "Created" },
  { key: "ACCEPTED", code: 202, label: "Accepted" },
  {
    key: "NON_AUTHORITATIVE_INFORMATION",
    code: 203,
    label: "Non-Authoritative Information",
  },
  { key: "NO_CONTENT", code: 204, label: "No Content" },
  { key: "RESET_CONTENT", code: 205, label: "Reset Content" },
  { key: "PARTIAL_CONTENT", code: 206, label: "Partial Content" },
  { key: "MULTI_STATUS", code: 207, label: "Multi-Status" },
  { key: "ALREADY_REPORTED", code: 208, label: "Already Reported" },
  { key: "IM_USED", code: 226, label: "IM Used" },
  { key: "MULTIPLE_CHOICES", code: 300, label: "Multiple Choices" },
  { key: "MOVED_PERMANENTLY", code: 301, label: "Moved Permanently" },
  { key: "FOUND", code: 302, label: "Found" },
  { key: "SEE_OTHER", code: 303, label: "See Other" },
  { key: "NOT_MODIFIED", code: 304, label: "Not Modified" },
  { key: "TEMPORARY_REDIRECT", code: 307, label: "Temporary Redirect" },
  { key: "PERMANENT_REDIRECT", code: 308, label: "Permanent Redirect" },

  { key: "BAD_REQUEST", code: 400, label: "Bad Request" },
  { key: "UNAUTHORIZED", code: 401, label: "Unauthorized" },
  { key: "PAYMENT_REQUIRED", code: 402, label: "Payment Required" },
  { key: "FORBIDDEN", code: 403, label: "Forbidden" },
  { key: "NOT_FOUND", code: 404, label: "Not Found" },
  { key: "METHOD_NOT_ALLOWED", code: 405, label: "Method Not Allowed" },
  { key: "NOT_ACCEPTABLE", code: 406, label: "Not Acceptable" },
  {
    key: "PROXY_AUTHENTICATION_REQUIRED",
    code: 407,
    label: "Proxy Authentication Required",
  },
  { key: "REQUEST_TIMEOUT", code: 408, label: "Request Timeout" },
  { key: "CONFLICT", code: 409, label: "Conflict" },
  { key: "GONE", code: 410, label: "Gone" },
  { key: "LENGTH_REQUIRED", code: 411, label: "Length Required" },
  { key: "PRECONDITION_FAILED", code: 412, label: "Precondition Failed" },
  { key: "CONTENT_TOO_LONG", code: 413, label: "Content Too Long" },
  { key: "URI_TOO_LONG", code: 414, label: "URI Too Long" },
  { key: "UNSUPPORTED_MEDIA_TYPE", code: 415, label: "Unsupported Media Type" },
  { key: "RANGE_NOT_SATISFIABLE", code: 416, label: "Range Not Satisfiable" },
  { key: "EXPECTATION_FAILED", code: 417, label: "Expectation Failed" },
  { key: "IM_A_TEAPOT", code: 418, label: "I'm a teapot" },
  { key: "MISDIRECTED_REQUEST", code: 421, label: "Misdirected Request" },
  { key: "UNPROCESSABLE_CONTENT", code: 422, label: "Unprocessable Content" },
  { key: "LOCKED", code: 423, label: "Locked" },
  { key: "FAILED_DEPENDENCY", code: 424, label: "Failed Dependency" },
  { key: "TOO_EARLY", code: 425, label: "Too Early" },
  { key: "UPGRADE_REQUIRED", code: 426, label: "Upgrade Required" },
  { key: "PRECONDITION_REQUIRED", code: 428, label: "Precondition Required" },
  { key: "TOO_MANY_REQUESTS", code: 429, label: "Too Many Requests" },
  {
    key: "REQUEST_HEADER_FIELDS_TOO_LARGE",
    code: 431,
    label: "Request Header Fields Too Large",
  },
  {
    key: "UNAVAILABLE_FOR_LEGAL_REASONS",
    code: 451,
    label: "Unavailable For Legal Reasons",
  },
  { key: "INTERNAL_SERVER_ERROR", code: 500, label: "Internal Server Error" },
  { key: "NOT_IMPLEMENTED", code: 501, label: "Not Implemented" },
  { key: "BAD_GATEWAY", code: 502, label: "Bad Gateway" },
  { key: "SERVICE_UNAVAILABLE", code: 503, label: "Service Unavailable" },
  { key: "GATEWAY_TIMEOUT", code: 504, label: "Gateway Timeout" },
  {
    key: "HTTP_VERSION_NOT_SUPPORTED",
    code: 505,
    label: "HTTP Version Not Supported",
  },
  {
    key: "VARIANT_ALSO_NEGOTIATES",
    code: 506,
    label: "Variant Also Negotiates",
  },
  { key: "INSUFFICIENT_STORAGE", code: 507, label: "Insufficient Storage" },
  { key: "LOOP_DETECTED", code: 508, label: "Loop Detected" },
  { key: "NOT_EXTENDED", code: 510, label: "Not Extended" },
  {
    key: "NETWORK_AUTHENTICATION_REQUIRED",
    code: 511,
    label: "Network Authentication Required",
  },
] as const;

// prettier-ignore
export type HttpSuccessStatus = Extract<(typeof HttpStatus)[number], { code:
  | 100 | 101 | 102 | 103
  | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226
  | 300 | 301 | 302 | 303 | 304 | 307 | 308
 }>;
export type HttpSuccessStatusKey = HttpSuccessStatus["key"];
export type HttpSuccessStatusCode = HttpSuccessStatus["code"];

// prettier-ignore
export type HttpErrorStatus = Extract<(typeof HttpStatus)[number], { code:
  400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409 | 410 |
  411 | 412 | 413 | 414 | 415 | 416 | 417 | 418 | 421 | 422 | 423 |
  424 | 425 | 426 | 428 | 429 | 431 | 451 |
  500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511 }
>;
export type HttpErrorStatusKey = HttpErrorStatus["key"];
export type HttpErrorStatusCode = HttpErrorStatus["code"];

export type HttpStatusKey = HttpSuccessStatusKey | HttpErrorStatusKey;
export type HttpStatusCode = HttpSuccessStatusCode | HttpErrorStatusCode;

export function getStatus(input: HttpStatusKey | HttpStatusCode) {
  return HttpStatus.find(
    (status) => status.key === input || status.code === input,
  )!;
}
