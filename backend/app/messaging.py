"""Outgoing SMS / WhatsApp. Pick the provider with SMS_PROVIDER.

console  prints to the server log (development; nothing is sent)
twilio   SMS through the Twilio REST API (needs an account and a sender number)
wati     WhatsApp through Wati (needs approved message templates in the Wati dashboard)
"""
import logging

import httpx

from .config import settings

log = logging.getLogger("gotrajet.messaging")
outbox: list[dict] = []  # last messages, kept for tests and the dev console


def send_sms(phone: str, text: str, template: str = "", params: list[str] | None = None) -> bool:
    record = {"to": phone, "text": text, "provider": settings.sms_provider}
    outbox.append(record)
    del outbox[:-200]
    provider = settings.sms_provider
    try:
        if provider == "twilio":
            r = httpx.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_sid}/Messages.json",
                data={"To": phone, "From": settings.twilio_from, "Body": text},
                auth=(settings.twilio_sid, settings.twilio_token),
                timeout=10,
            )
            r.raise_for_status()
        elif provider == "wati":
            # WhatsApp business messages must use a template approved by Meta.
            r = httpx.post(
                f"{settings.wati_endpoint}/api/v1/sendTemplateMessage",
                params={"whatsappNumber": phone.replace("+", "").replace(" ", "")},
                headers={"Authorization": f"Bearer {settings.wati_token}"},
                json={
                    "template_name": template or "gotrajet_update",
                    "broadcast_name": template or "gotrajet_update",
                    "parameters": [{"name": str(i + 1), "value": v} for i, v in enumerate(params or [text])],
                },
                timeout=10,
            )
            r.raise_for_status()
        else:
            log.warning("[SMS console] to %s: %s", phone, text)
        return True
    except httpx.HTTPError as exc:  # never break the user's action because an SMS failed
        log.error("SMS to %s failed via %s: %s", phone, provider, exc)
        return False
