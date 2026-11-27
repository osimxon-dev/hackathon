// Vercel serverless funksiyasi: vercel.json barcha /api/* so'rovlarini shu yerga yo'naltiradi.
import { handleApi } from '../src/app.js';

export default function handler(req, res) {
  return handleApi(req, res);
}
