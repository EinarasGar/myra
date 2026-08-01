export const AUTH_PITCH_TITLE = "Everything you own, in one ledger."

export const AUTH_PITCH_BODY =
  "Sverto tracks daily spending, investments and net worth in the same place — a grocery run, a bank transfer and an ETF purchase are all just transactions."

export const AUTH_PITCH_POINTS = [
  "Balances, holdings and net worth are derived live — fix a transaction from two years ago and every chart that depended on it corrects itself.",
  "First-class multi-currency: a currency is just an asset, and everything converts into the one you pick.",
  "Myra, the built-in assistant, can read it all and never writes without your approval.",
] as const

export const BRAND_FOOT =
  "Open source under AGPL · self-host it or use sverto.com · your data stays yours either way."

export const SIGN_IN_EYEBROW = "Welcome back"
export const SIGN_IN_TITLE = "Sign in to Sverto"
export const SIGN_IN_CTA = "Sign in"
export const SIGN_IN_PENDING_CTA = "Signing in…"

export const SIGN_UP_EYEBROW = "New here"
export const SIGN_UP_TITLE = "Create your Sverto account"
export const SIGN_UP_CTA = "Create account"
export const SIGN_UP_PENDING_CTA = "Creating account…"

export const SIGN_UP_INTRO =
  "A username, a password and your base currency. The base currency comes next, and it is the only thing Sverto cannot start without."

export const SIGN_UP_FOOT =
  "Creating an account takes about a minute. Nothing is imported until you ask for it."

export const USERNAME_LABEL = "Username"
export const PASSWORD_LABEL = "Password"
export const CONFIRM_PASSWORD_LABEL = "Confirm password"

export const USERNAME_NOTE = "Sign-in here is by username, not email address."

export const PASSWORD_RULE = "Between 8 and 200 characters. Spaces count."

export const PASSWORD_MISMATCH = "The two passwords are different."

export const PASSWORD_TOO_SHORT = "Use at least 8 characters."

export const CREDENTIALS_REQUIRED =
  "Fill in both a username and a password to sign in."

export const SIGN_IN_FAILED_HEADLINE = "That username and password don't match"

export const SIGN_IN_FAILED_BODY =
  "Sverto does not say whether the username exists. Check both fields and try again."

export const SIGN_IN_FAILED_LOCKOUT_NOTE =
  "Sign-in slows down when too many attempts arrive at once rather than locking after a fixed number of tries, so a few quick retries are fine — a burst is not."

export const NO_PASSWORD_AUTH_HEADLINE =
  "Password sign-in is not available here"

export const NO_PASSWORD_AUTH_BODY =
  "This Sverto was built without password sign-in. If you run it yourself, rebuild it with the database auth feature, or point this page at the sign-in it actually uses."

export const SERVER_UNREACHABLE_HEADLINE = "Can't reach Sverto"

export const SERVER_UNREACHABLE_BODY =
  "Nothing was sent. If you self-host, the instance may be asleep or only reachable on its own network."

export const NO_SIGN_UP_HEADLINE = "New accounts cannot be created here"

export const NO_SIGN_UP_BODY =
  "This Sverto was built without password sign-up, so accounts have to be created another way on this instance."

export const CLERK_INTRO =
  "Sign-in is handled by Clerk for this instance. Sverto never sees your password."

export const CLERK_LOADING = "Loading the sign-in form…"

export const CLERK_SIGNED_IN_HEADLINE = "You're signed in"

export const CLERK_SIGNED_IN_BODY =
  "Clerk has a session for you. Sverto is fetching your account now."

export const NOAUTH_EYEBROW = "Development build"

export const NOAUTH_TITLE = "There is no sign-in on this build"

export const NOAUTH_INTRO =
  "This deployment runs AUTH_PROVIDER=noauth: the server accepts every request without a token and treats you as the default development user. There is no form here because there is nothing to sign in to."

export const NOAUTH_FOOT =
  "Set AUTH_PROVIDER to database or clerk in the repo-root .env and run make setup-env to get the real sign-in screen."

export const NOAUTH_OPEN_APP = "Open Sverto"

export const SIGN_UP_SWITCH_PROMPT = "No account yet?"
export const SIGN_UP_SWITCH_LINK = "Create one →"
export const SIGN_IN_SWITCH_PROMPT = "Already have an account?"
export const SIGN_IN_SWITCH_LINK = "Sign in →"
