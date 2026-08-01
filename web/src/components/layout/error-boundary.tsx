import { Component, type ErrorInfo, type ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: (error: unknown, reset: () => void) => ReactNode
  onReset?: () => void
  resetKey?: unknown
}

interface ErrorBoundaryState {
  caught: boolean
  error: unknown
}

const CLEAR: ErrorBoundaryState = { caught: false, error: undefined }

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = CLEAR

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { caught: true, error }
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.caught && previous.resetKey !== this.props.resetKey) {
      this.setState(CLEAR)
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(error, info.componentStack)
    }
  }

  reset = () => {
    this.props.onReset?.()
    this.setState(CLEAR)
  }

  render() {
    if (this.state.caught) {
      return this.props.fallback(this.state.error, this.reset)
    }
    return this.props.children
  }
}
