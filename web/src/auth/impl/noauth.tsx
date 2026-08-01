import { useAuthMe } from "../auth-me"
import { useAuthSession } from "../session"
import { AuthSessionScope } from "../session-scope"
import { useAuthTransport } from "../transport"
import type { AuthProviderComponent } from "../types"

const signOut = () => Promise.resolve()

export const AuthProvider: AuthProviderComponent = ({ children }) => {
  useAuthTransport(null)

  const me = useAuthMe(true)

  const session = useAuthSession({
    isProviderReady: true,
    hasCredential: true,
    identity: me,
    signOut,
  })

  return <AuthSessionScope session={session}>{children}</AuthSessionScope>
}
