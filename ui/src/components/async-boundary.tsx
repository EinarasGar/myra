import {
  ReactNode,
  Suspense,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import ErrorBoundaryFallback from "@/components/error-boundary-fallback";

export interface AsyncBoundaryState {
  readonly isLoading: boolean;
  readonly isError: boolean;
}

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  /** Must be referentially stable (wrap in useCallback) */
  errorFallback?: (props: FallbackProps) => ReactNode;
  /** Must be referentially stable (useState setters are stable, otherwise wrap in useCallback) */
  onStateChange?: (state: AsyncBoundaryState) => void;
}

export const ASYNC_BOUNDARY_STATES = {
  idle: { isLoading: false, isError: false },
  loading: { isLoading: true, isError: false },
  error: { isLoading: false, isError: true },
} as const;

export function useAsyncBoundaryState() {
  return useState<AsyncBoundaryState>(ASYNC_BOUNDARY_STATES.loading);
}

function SuspenseTracker({
  fallback,
  onMount,
  onUnmount,
}: {
  fallback?: ReactNode;
  onMount: () => void;
  onUnmount: () => void;
}) {
  const onMountRef = useRef(onMount);
  const onUnmountRef = useRef(onUnmount);

  useLayoutEffect(() => {
    onMountRef.current = onMount;
    onUnmountRef.current = onUnmount;
  });

  useEffect(() => {
    onMountRef.current();
    return () => onUnmountRef.current();
  }, []);

  return <>{fallback}</>;
}

SuspenseTracker.displayName = "SuspenseTracker";

/**
 * Combines Suspense, ErrorBoundary, and QueryErrorResetBoundary with
 * optional state tracking.
 *
 * @example
 * ```tsx
 * <AsyncBoundary
 *   fallback={<Skeleton />}
 *   onStateChange={useCallback((s) => setParentLoading(s.isLoading), [])}
 * >
 *   <SuspendingComponent />
 * </AsyncBoundary>
 * ```
 *
 * Note: `onStateChange` and `errorFallback` must be memoized to avoid
 * unnecessary remounts and state churn.
 */
export function AsyncBoundary({
  children,
  fallback,
  errorFallback,
  onStateChange,
}: AsyncBoundaryProps) {
  const [state, setState] = useState<AsyncBoundaryState>(
    ASYNC_BOUNDARY_STATES.idle,
  );
  const [resetCount, setResetCount] = useState(0);

  const onStateChangeRef = useRef(onStateChange);
  useLayoutEffect(() => {
    onStateChangeRef.current = onStateChange;
  });

  useEffect(() => {
    onStateChangeRef.current?.(state);
    return () => {
      if (state.isLoading || state.isError) {
        onStateChangeRef.current?.(ASYNC_BOUNDARY_STATES.idle);
      }
    };
  }, [state]);

  const handleLoadingStart = useCallback(() => {
    setState((prev) =>
      prev === ASYNC_BOUNDARY_STATES.loading
        ? prev
        : ASYNC_BOUNDARY_STATES.loading,
    );
  }, []);

  const handleLoadingEnd = useCallback(() => {
    setState((prev) => (prev.isError ? prev : ASYNC_BOUNDARY_STATES.idle));
  }, []);

  const handleError = useCallback(() => {
    setState((prev) =>
      prev === ASYNC_BOUNDARY_STATES.error ? prev : ASYNC_BOUNDARY_STATES.error,
    );
  }, []);

  const handleReset = useCallback((queryReset: () => void) => {
    setState(ASYNC_BOUNDARY_STATES.idle);
    setResetCount((c) => c + 1);
    queryReset();
  }, []);

  const fallbackRender = useMemo(
    () =>
      errorFallback ??
      ((props: FallbackProps) => (
        <ErrorBoundaryFallback
          error={props.error}
          resetErrorBoundary={props.resetErrorBoundary}
        />
      )),
    [errorFallback],
  );

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          key={resetCount}
          onReset={() => handleReset(reset)}
          onError={handleError}
          fallbackRender={fallbackRender}
        >
          <Suspense
            fallback={
              <SuspenseTracker
                fallback={fallback}
                onMount={handleLoadingStart}
                onUnmount={handleLoadingEnd}
              />
            }
          >
            {children}
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

AsyncBoundary.displayName = "AsyncBoundary";
