export const WORLDPOP_ROUTE_DEADLINE_MS = 20_000;

export function withDeadline<T>(
  operation: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new DOMException('WorldPop request deadline exceeded.', 'TimeoutError'));
    }, timeoutMs);

    operation.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
