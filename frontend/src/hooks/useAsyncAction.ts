import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, isApiError } from '../api/errors';

export type AsyncState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: ApiError };

function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  return new ApiError({ kind: 'http', detail: null });
}

export interface AsyncAction<A extends unknown[], R> {
  readonly state: AsyncState<R>;
  /** Resolves with the result, or undefined on failure/cancellation (state carries the error). */
  readonly run: (...args: A) => Promise<R | undefined>;
  readonly cancel: () => void;
  readonly reset: () => void;
}

/**
 * Runs one async operation at a time with a typed state machine. Starting a new run aborts the
 * previous one, and unmounting aborts the in-flight request.
 */
export function useAsyncAction<A extends unknown[], R>(
  action: (signal: AbortSignal, ...args: A) => Promise<R>,
): AsyncAction<A, R> {
  const [state, setState] = useState<AsyncState<R>>({ status: 'idle' });
  const actionRef = useRef(action);
  actionRef.current = action;
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const run = useCallback(async (...args: A): Promise<R | undefined> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading' });
    try {
      const data = await actionRef.current(controller.signal, ...args);
      if (mountedRef.current && controllerRef.current === controller) {
        setState({ status: 'success', data });
      }
      return data;
    } catch (error) {
      if (!mountedRef.current || controllerRef.current !== controller) return undefined;
      const apiError = toApiError(error);
      setState(apiError.kind === 'aborted' ? { status: 'idle' } : { status: 'error', error: apiError });
      return undefined;
    }
  }, []);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);
  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: 'idle' });
  }, []);

  return { state, run, cancel, reset };
}
