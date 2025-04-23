declare module 'sib-api-v3-sdk' {
  export namespace ApiClient {
    export const instance: any;
  }
  
  export class TransactionalEmailsApi {
    constructor(apiClient?: any);
    sendTransacEmail(sendSmtpEmail: SendSmtpEmail): Promise<any>;
  }
  
  export class SendSmtpEmail {
    subject?: string;
    htmlContent?: string;
    textContent?: string;
    sender?: { name: string; email: string };
    to?: { email: string }[];
    attachment?: Array<{
      content: string;
      name: string;
      contentType?: string;
    }>;
  }
} 