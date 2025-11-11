import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

export const resendClient = apiKey ? new Resend(apiKey) : null;

