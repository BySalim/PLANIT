import { Injectable, Logger } from '@nestjs/common';

interface MailOptions {
  to: string;
  subject: string;
  text: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(options: MailOptions): Promise<void> {
    // Placeholder — integrate with Resend/SendGrid in Vague 02
    this.logger.log(`[MAIL stub] to=${options.to} subject="${options.subject}"`);
  }
}
