export function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Something went wrong");
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) {
    return "This email was created before instant signup was enabled. Please use a fresh email address, or a + alias like you+host1@example.com.";
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("already in use") ||
    normalized.includes("user already exists")
  ) {
    return "This email already has an account. Sign in with that account, or use a new email address.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Those login details do not match an existing account. Check the password or use a new email address.";
  }

  return message;
}

export function isExistingAccountError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("already registered") ||
    normalized.includes("already in use") ||
    normalized.includes("user already exists")
  );
}