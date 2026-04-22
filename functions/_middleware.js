export async function onRequest(context) {
  context.data.db = context.env.DB;
  return context.next();
}
