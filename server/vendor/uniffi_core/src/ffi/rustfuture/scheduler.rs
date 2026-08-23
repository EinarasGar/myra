/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

use std::mem;

use super::{RustFutureContinuationCallback, RustFuturePoll};

pub(super) struct ScheduledContinuation {
    callback: RustFutureContinuationCallback,
    data: u64,
    poll: RustFuturePoll,
}

impl ScheduledContinuation {
    pub(super) fn invoke(self) {
        (self.callback)(self.data, self.poll);
    }
}

/// Schedules a [crate::RustFuture] by managing the continuation data
///
/// This struct manages the continuation callback and data that comes from the foreign side.  It
/// is responsible for calling the continuation callback when the future is ready to be woken up.
///
/// The basic guarantees are:
///
/// * Each callback will be invoked exactly once, with its associated data.
/// * If `wake()` is called, the callback will be invoked to wake up the future -- either
///   immediately or the next time we get a callback.
/// * If `cancel()` is called, the same will happen and the schedule will stay in the cancelled
///   state, invoking any future callbacks as soon as they're stored.

#[derive(Debug)]
pub(super) enum Scheduler {
    /// No continuations set, neither wake() nor cancel() called.
    Empty,
    /// `wake()` was called when there was no continuation set.  The next time `store` is called,
    /// the continuation should be immediately invoked with `RustFuturePoll::Wake`
    Waked,
    /// The future has been cancelled, any future `store` calls should immediately result in the
    /// continuation being called with `RustFuturePoll::Ready`.
    Cancelled,
    /// Continuation set, the next time `wake()`  is called is called, we should invoke it.
    Set(RustFutureContinuationCallback, u64),
}

impl Scheduler {
    pub(super) fn new() -> Self {
        Self::Empty
    }

    /// Store new continuation data if we are in the `Empty` state.  If we are in the `Waked` or
    /// `Cancelled` state, call the continuation immediately with the data.
    pub(super) fn store(
        &mut self,
        callback: RustFutureContinuationCallback,
        data: u64,
    ) -> Option<ScheduledContinuation> {
        match self {
            Self::Empty => {
                *self = Self::Set(callback, data);
                None
            }
            Self::Set(old_callback, old_data) => {
                trace!(
                    "store: observed `Self::Set` state.  Is poll() being called from multiple threads at once?"
                );
                let continuation = ScheduledContinuation {
                    callback: *old_callback,
                    data: *old_data,
                    poll: RustFuturePoll::Ready,
                };
                *self = Self::Set(callback, data);
                Some(continuation)
            }
            Self::Waked => {
                *self = Self::Empty;
                Some(ScheduledContinuation {
                    callback,
                    data,
                    poll: RustFuturePoll::Wake,
                })
            }
            Self::Cancelled => Some(ScheduledContinuation {
                callback,
                data,
                poll: RustFuturePoll::Ready,
            }),
        }
    }

    pub(super) fn wake(&mut self) -> Option<ScheduledContinuation> {
        match self {
            // If we had a continuation set, then call it and transition to the `Empty` state.
            Self::Set(callback, old_data) => {
                let old_data = *old_data;
                let callback = *callback;
                *self = Self::Empty;
                Some(ScheduledContinuation {
                    callback,
                    data: old_data,
                    poll: RustFuturePoll::Wake,
                })
            }
            // If we were in the `Empty` state, then transition to `Waked`.  The next time `store`
            // is called, we will immediately call the continuation.
            Self::Empty => {
                *self = Self::Waked;
                None
            }
            // This is a no-op if we were in the `Cancelled` or `Waked` state.
            _ => None,
        }
    }

    pub(super) fn cancel(&mut self) -> Option<ScheduledContinuation> {
        if let Self::Set(callback, old_data) = mem::replace(self, Self::Cancelled) {
            Some(ScheduledContinuation {
                callback,
                data: old_data,
                poll: RustFuturePoll::Ready,
            })
        } else {
            None
        }
    }

    pub(super) fn is_cancelled(&self) -> bool {
        matches!(self, Self::Cancelled)
    }
}

// The `*const ()` data pointer references an object on the foreign side.
// This object must be `Sync` in Rust terminology -- it must be safe for us to pass the pointer to the continuation callback from any thread.
// If the foreign side upholds their side of the contract, then `Scheduler` is Send + Sync.

unsafe impl Send for Scheduler {}
unsafe impl Sync for Scheduler {}

#[cfg(test)]
mod tests {
    use std::{
        sync::{mpsc, Arc, Mutex},
        time::Duration,
    };

    use super::*;

    struct ReentrantState {
        scheduler: Arc<Mutex<Scheduler>>,
        completed: mpsc::Sender<()>,
    }

    extern "C" fn reentrant_continuation(data: u64, _poll: RustFuturePoll) {
        let state = unsafe { Arc::from_raw(data as *const ReentrantState) };
        let _scheduler = state.scheduler.lock().unwrap();
        state.completed.send(()).unwrap();
    }

    #[test]
    fn continuation_is_invoked_after_scheduler_lock_is_released() {
        let scheduler = Arc::new(Mutex::new(Scheduler::new()));
        let (completed, completion) = mpsc::channel();
        let state = Arc::new(ReentrantState {
            scheduler: Arc::clone(&scheduler),
            completed,
        });
        let data = Arc::into_raw(Arc::clone(&state)) as u64;

        scheduler
            .lock()
            .unwrap()
            .store(reentrant_continuation, data);

        let scheduler_for_wake = Arc::clone(&scheduler);
        let worker = std::thread::spawn(move || {
            let continuation = scheduler_for_wake.lock().unwrap().wake();
            if let Some(continuation) = continuation {
                continuation.invoke();
            }
        });

        assert!(
            completion.recv_timeout(Duration::from_millis(250)).is_ok(),
            "continuation deadlocked while re-entering the scheduler"
        );
        worker.join().unwrap();
    }
}
