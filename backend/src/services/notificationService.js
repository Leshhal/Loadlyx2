export async function deliverNotification(notification) {
  if (notification.channel === 'IN_APP') return { providerId: `in-app:${notification.id}`, delivered: true };
  const url = notification.channel === 'EMAIL' ? process.env.EMAIL_WEBHOOK_URL : notification.channel === 'SMS' ? process.env.SMS_WEBHOOK_URL : process.env.PUSH_WEBHOOK_URL;
  const secret = notification.channel === 'EMAIL' ? process.env.EMAIL_WEBHOOK_SECRET : notification.channel === 'SMS' ? process.env.SMS_WEBHOOK_SECRET : process.env.PUSH_WEBHOOK_SECRET;
  if (!url) throw new Error(`${notification.channel} provider is not configured`);
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(secret ? { Authorization: `Bearer ${secret}` } : {}) }, body: JSON.stringify({ to: notification.recipient, subject: notification.subject, templateKey: notification.templateKey, data: notification.payloadJson }) });
  if (!response.ok) throw new Error(`${notification.channel} provider returned ${response.status}`);
  const data = await response.json().catch(() => ({}));
  return { providerId: data.id || response.headers.get('x-request-id') || null, delivered: true };
}
