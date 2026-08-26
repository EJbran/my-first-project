type RequestLike = unknown;

type ResponseLike = {
  status: (statusCode: number) => ResponseLike;
  json: (payload: Record<string, unknown>) => unknown;
};

type NextLike = (error?: unknown) => void;

type ErrorLike = {
  message?: unknown;
  name?: unknown;
  errors?: unknown;
  original?: unknown;
  parent?: unknown;
};

const normalizeMessage = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const collectNestedMessages = (source: unknown): string[] => {
  if (!source || typeof source !== "object") {
    return [];
  }

  const err = source as ErrorLike;
  const messages: string[] = [];

  const direct = normalizeMessage(err.message);
  if (direct) {
    messages.push(direct);
  }

  if (Array.isArray(err.errors)) {
    for (const child of err.errors) {
      const childMessage =
        child && typeof child === "object"
          ? normalizeMessage((child as { message?: unknown }).message)
          : "";
      if (childMessage) {
        messages.push(childMessage);
      }
    }
  }

  return messages;
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error && normalizeMessage(error.message)) {
    return normalizeMessage(error.message);
  }

  if (typeof error === "object" && error) {
    const directMessage = normalizeMessage((error as { message?: unknown }).message);

    if (directMessage) {
      return directMessage;
    }

    const aggregateMessages = collectNestedMessages(error);
    if (aggregateMessages.length > 0) {
      return aggregateMessages.join(" | ");
    }

    const originalMessages = collectNestedMessages((error as ErrorLike).original);
    if (originalMessages.length > 0) {
      return originalMessages.join(" | ");
    }

    const parentMessages = collectNestedMessages((error as ErrorLike).parent);
    if (parentMessages.length > 0) {
      return parentMessages.join(" | ");
    }
  }

  return "Internal server error";
};

export const errorHandler = (
  error: unknown,
  _req: RequestLike,
  res: ResponseLike,
  _next: NextLike
) => {
  const message = extractErrorMessage(error);

  if (error instanceof Error) {
    console.error("Unhandled API error", {
      message,
      stack: error.stack
    });
  } else {
    console.error("Unhandled API error", {
      message,
      error
    });
  }

  const missingObjectMatch = /Invalid object name '([^']+)'/i.exec(message);

  if (missingObjectMatch?.[1]) {
    return res.status(503).json({
      success: false,
      message: `Database schema is incomplete: missing table ${missingObjectMatch[1]}. Run database initialization/migrations for this environment.`
    });
  }

  const statusCode = /Unauthorized|Missing|Invalid token/i.test(message)
    ? 401
    : /Forbidden/i.test(message)
      ? 403
      : /required|validation|exists|Invalid/i.test(message)
        ? 400
        : 500;

  return res.status(statusCode).json({
    success: false,
    message
  });
};
