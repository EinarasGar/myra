import { Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"

import { AuthScreenFrame } from "./auth-screen-frame"
import {
  NOAUTH_EYEBROW,
  NOAUTH_FOOT,
  NOAUTH_INTRO,
  NOAUTH_OPEN_APP,
  NOAUTH_TITLE,
} from "./copy"

export function NoauthScreen() {
  return (
    <AuthScreenFrame
      eyebrow={NOAUTH_EYEBROW}
      title={NOAUTH_TITLE}
      intro={NOAUTH_INTRO}
      footer={NOAUTH_FOOT}
    >
      <Link to="/" className={buttonVariants({ size: "lg" })}>
        {NOAUTH_OPEN_APP}
      </Link>
    </AuthScreenFrame>
  )
}
