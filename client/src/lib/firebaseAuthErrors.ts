type AuthErrorPresentation = {
  message: string;
  field?: "email" | "password";
};

const FALLBACK_AUTH_ERROR: AuthErrorPresentation = {
  message: "Something went wrong while contacting authentication. Please try again.",
};

function getFirebaseErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return null;
}

export function getFirebaseAuthErrorPresentation(error: unknown): AuthErrorPresentation {
  const code = getFirebaseErrorCode(error);

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return {
        message: "Incorrect email or password.",
        field: "password",
      };
    case "auth/invalid-email":
      return {
        message: "Enter a valid email address.",
        field: "email",
      };
    case "auth/too-many-requests":
      return {
        message: "Too many sign-in attempts. Please wait a bit and try again.",
      };
    case "auth/network-request-failed":
      return {
        message: "Authentication could not reach the network. Check your connection and try again.",
      };
    case "auth/email-already-in-use":
      return {
        message: "That email is already in use. Try signing in instead.",
        field: "email",
      };
    case "auth/weak-password":
      return {
        message: "Choose a stronger password with at least 6 characters.",
        field: "password",
      };
    case "auth/popup-closed-by-user":
      return {
        message: "Google sign-in was canceled before it finished.",
      };
    default:
      return FALLBACK_AUTH_ERROR;
  }
}
