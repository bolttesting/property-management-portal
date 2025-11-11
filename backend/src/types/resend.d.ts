declare module 'resend' {
  interface ResendSendOptions {
    from: string;
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    html?: string;
    text?: string;
  }

  interface ResendClientOptions {
    apiKey?: string;
  }

  interface ResendEmailResponse {
    data?: {
      id: string;
    };
    error?: unknown;
    headers?: Record<string, string>;
  }

  class Resend {
    constructor(apiKey?: string);
    emails: {
      send(options: ResendSendOptions): Promise<ResendEmailResponse>;
    };
  }

  export { Resend };
}


