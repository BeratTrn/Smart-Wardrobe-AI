import axios from "axios";

/**
 * Extracts a human-readable message from any error shape.
 *
 * The Smart Wardrobe backend returns errors as:
 *   { mesaj: "Turkish/English error description" }
 *
 * Falls back to a generic message for network errors or unknown shapes.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Backend validation / business-logic error
    const serverMsg = error.response?.data?.mesaj as string | undefined;
    if (serverMsg) return serverMsg;

    // Network-level errors
    if (error.code === "ECONNABORTED") return "Request timed out. Please try again.";
    if (!error.response) return "Unable to reach the server. Check your connection.";

    // HTTP status fallbacks
    const status = error.response.status;
    if (status === 429) return "Too many requests. Please wait a moment.";
    if (status >= 500) return "Server error. Please try again later.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong. Please try again.";
}

/**
 * Returns true when the error is a 403 with requiresVerification set.
 * Used in the login mutation to redirect unverified users to /verify-email.
 */
export function isVerificationRequired(error: unknown): {
  required: boolean;
  email?: string;
} {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) {
    return { required: false };
  }
  const data = error.response.data as {
    requiresVerification?: boolean;
    email?: string;
  };
  if (data?.requiresVerification) {
    return { required: true, email: data.email };
  }
  return { required: false };
}
