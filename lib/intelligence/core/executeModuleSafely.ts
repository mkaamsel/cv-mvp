export async function executeModuleSafely<T>(fn: () => Promise<T>): Promise<{
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
}> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown module error.",
    };
  }
}