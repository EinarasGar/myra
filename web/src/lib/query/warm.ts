/**
 * Starts every request at once and resolves immediately, so a route loader can put its
 * screen's queries in flight without becoming the thing the navigation waits on.
 *
 * Rejections are swallowed on purpose: warming is a hint, and a failure here must not
 * turn a hover into a route error. The component that needs the data requests it through
 * the same key and reports the failure itself.
 */
export function warm(requests: readonly Promise<unknown>[]): void {
  for (const request of requests) {
    void request.catch(ignore)
  }
}

function ignore(): void {}
