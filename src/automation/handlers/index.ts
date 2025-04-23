import sendEmail from "./send_email";
import httpRequest from "./http_request";
import condition from "./condition";

export const handlers: Record<string, Function> = {
  send_email: sendEmail,
  http_request: httpRequest,
  condition: condition,
};
