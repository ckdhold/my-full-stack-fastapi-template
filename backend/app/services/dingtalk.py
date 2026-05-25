import base64
import hashlib
import hmac
import logging
import time
import urllib.parse

import httpx

logger = logging.getLogger(__name__)


def _signed_webhook_url(webhook_url: str, secret: str | None) -> str:
    if not secret:
        return webhook_url
    timestamp = str(int(time.time() * 1000))
    string_to_sign = f"{timestamp}\n{secret}"
    digest = hmac.new(
        secret.encode("utf-8"),
        string_to_sign.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    sign = urllib.parse.quote_plus(base64.b64encode(digest))
    sep = "&" if "?" in webhook_url else "?"
    return f"{webhook_url}{sep}timestamp={timestamp}&sign={sign}"


def send_dingtalk_markdown(
    *,
    webhook_url: str,
    secret: str | None,
    title: str,
    text: str,
) -> None:
    url = _signed_webhook_url(webhook_url, secret)
    payload = {
        "msgtype": "markdown",
        "markdown": {"title": title, "text": text},
    }
    with httpx.Client(timeout=10) as client:
        response = client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        if data.get("errcode", 0) != 0:
            raise RuntimeError(data.get("errmsg", "DingTalk API error"))
