type SafeModuleResult<T> = {
  ok: boolean;
  data: T | null;
  error: string | null;
};

export async function executeModuleSafely<T>(
  label: string,
  runner: () => Promise<T>
): Promise<SafeModuleResult<T>> {
  try {
    const data = await runner();

    return {
      ok: true,
      data,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `${label} failed`;

    console.error(`[${label}]`, error);

    return {
      ok: false,
      data: null,
      error: message,
    };
  }
}