/**
 * Cloudflare Pages Functions middleware.
 *
 * Responsibilities:
 *  1. Read the Cloudflare Access identity header and resolve / create the
 *     matching `testers` row. The resolved tester is attached to
 *     `context.data.tester` so downstream handlers can stamp author_id
 *     without re-querying.
 *  2. Expose the D1 binding as `context.data.db` for ergonomics.
 *
 * NOTE: stub for Phase 1. The concrete implementation lands in Phase 3.
 */
export async function onRequest(context) {
  context.data.db = context.env.DB;
  // TODO Phase 3: resolve tester from Cf-Access-Authenticated-User-Email.
  context.data.tester = null;
  return context.next();
}
