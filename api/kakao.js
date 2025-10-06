import { handleSkillRequest } from '../src/kakao/skillController.js';
import { buildErrorResponse } from '../src/kakao/responseBuilder.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const body =
      typeof req.body === 'string' && req.body.length
        ? JSON.parse(req.body)
        : req.body ?? {};

    const response = await handleSkillRequest(body);
    res.status(200).json(response);
  } catch (error) {
    console.error('Kakao skill handler error:', error);
    const response = buildErrorResponse(error.message ?? 'Unknown error');
    res.status(500).json(response);
  }
}

