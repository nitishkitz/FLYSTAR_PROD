"""Resend email service — sends branded status notification emails."""
import os
import asyncio
import logging
from typing import Optional

import resend

log = logging.getLogger("flystar.email")

resend.api_key = os.environ.get("RESEND_API_KEY", "")

SENDER_NAME = os.environ.get("SENDER_NAME", "Flystar")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
CC_ADMIN = os.environ.get("EMAIL_CC_ADMIN", "false").lower() in ("1", "true", "yes")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")
PORTAL_URL = os.environ.get("PORTAL_URL", "")

STATUS_LABEL = {
    "requested": "Pickup requested",
    "assigned": "Field employee assigned",
    "en_route_to_pickup": "Employee en route to your pickup",
    "picked_up": "Picked up",
    "at_hub": "At hub",
    "packed": "Packed for dispatch",
    "dispatched": "Dispatched",
    "in_transit": "In transit",
    "customs": "Clearing customs",
    "out_for_delivery": "Out for delivery",
    "delivered": "Delivered",
    "exception": "Delivery exception",
    "cancelled": "Cancelled",
}


def _render_email(awb: str, customer_name: str, status: str, location: str, note: str, route: str) -> str:
    label = STATUS_LABEL.get(status, status.replace("_", " ").title())
    accent = "#d91a2a"
    if status == "delivered":
        accent = "#10b981"
    elif status == "exception" or status == "cancelled":
        accent = "#b8121f"
    track_url = f"{PORTAL_URL}/track/{awb}" if PORTAL_URL else f"https://flystar.in/track/{awb}"
    return f"""
<!doctype html><html><body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#12263e;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fb;padding:32px 12px;">
    <tr><td align="center">
      <table width="560" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border:1px solid #e3e8ef;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#0b2545;padding:24px 28px;color:white;">
          <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#9aa9bf;">Flystar Operations</div>
          <div style="font-size:22px;font-weight:700;margin-top:4px;">Shipment update</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <div style="display:inline-block;padding:6px 12px;border-radius:999px;background:{accent}1a;color:{accent};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">{label}</div>
          <h2 style="margin:16px 0 6px;font-size:24px;color:#0b2545;">Hi {customer_name or 'there'},</h2>
          <p style="margin:0;color:#607087;font-size:15px;line-height:1.6;">Your shipment <b style="color:#0b2545;font-family:Menlo,Consolas,monospace;">{awb}</b> has a new update.</p>
          <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;background:#fbfcfe;border:1px solid #e3e8ef;border-radius:10px;">
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e3e8ef;"><div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#607087;">Route</div><div style="font-size:14px;color:#0b2545;font-weight:600;margin-top:2px;">{route}</div></td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e3e8ef;"><div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#607087;">Status</div><div style="font-size:14px;color:#0b2545;font-weight:600;margin-top:2px;">{label}</div></td></tr>
            {f'<tr><td style="padding:14px 16px;border-bottom:1px solid #e3e8ef;"><div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#607087;">Location</div><div style="font-size:14px;color:#0b2545;font-weight:600;margin-top:2px;">{location}</div></td></tr>' if location else ''}
            {f'<tr><td style="padding:14px 16px;"><div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#607087;">Note</div><div style="font-size:14px;color:#0b2545;margin-top:2px;">{note}</div></td></tr>' if note else ''}
          </table>
          <div style="text-align:center;margin-top:24px;">
            <a href="{track_url}" style="display:inline-block;background:{accent};color:white;text-decoration:none;padding:13px 22px;border-radius:10px;font-weight:700;font-size:14px;">Track shipment</a>
          </div>
          <p style="margin:28px 0 0;color:#9aa9bf;font-size:12px;text-align:center;">Flystar International Courier · Tirupati · flystarintl1@gmail.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
"""


async def send_status_email(*, awb: str, customer_email: str, customer_name: str,
                            status: str, location: str = "", note: str = "",
                            route: str = "") -> Optional[str]:
    """Fire-and-forget email. Returns id on success, None on failure."""
    if not resend.api_key:
        log.info("Resend not configured — skipping email.")
        return None
    label = STATUS_LABEL.get(status, status)
    html = _render_email(awb, customer_name, status, location, note, route)
    to = [customer_email] if customer_email else []
    if not to:
        return None
    params = {
        "from": f"{SENDER_NAME} <{SENDER_EMAIL}>",
        "to": to,
        "subject": f"[{awb}] {label}",
        "html": html,
    }
    if CC_ADMIN and ADMIN_EMAIL and ADMIN_EMAIL not in to:
        params["cc"] = [ADMIN_EMAIL]
    try:
        res = await asyncio.to_thread(resend.Emails.send, params)
        log.info(f"Sent email for {awb} status={status} id={res.get('id')}")
        return res.get("id")
    except Exception as e:
        log.warning(f"Failed to send email for {awb}: {e}")
        return None
