// Route handlers call revalidateTag after writes; outside a Next request there is no cache to purge.
export function revalidateTag() {}
export function revalidatePath() {}
