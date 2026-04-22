import { json } from '../../_lib/http.js';

export async function onRequestGet(context) {
  return json({ user: context.data.user });
}
