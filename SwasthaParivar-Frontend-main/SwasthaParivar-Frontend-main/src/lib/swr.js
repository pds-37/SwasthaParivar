export const apiRetryConfig = {
  revalidateOnFocus: false,
  shouldRetryOnError: true,
  errorRetryCount: 4,
  onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
    if (error?.status && error.status < 500) {
      return;
    }

    if (retryCount >= 4) {
      return;
    }

    const delayMs = Math.min(2500 * (retryCount + 1), 8000);
    setTimeout(() => revalidate({ retryCount }), delayMs);
  },
};

export default apiRetryConfig;
