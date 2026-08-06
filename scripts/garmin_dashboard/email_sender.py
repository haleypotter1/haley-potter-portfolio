"""Sends the assembled report as a multipart/related email with each chart
inline via Content-ID, rather than base64 data URIs — CID attachments render
reliably in Gmail, where inline `data:` images are inconsistently supported.
"""

import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def send_report(
    html_body: str,
    chart_images: dict[str, bytes | None],
    subject: str,
    gmail_address: str,
    gmail_app_password: str,
    recipient: str,
) -> None:
    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = gmail_address
    msg["To"] = recipient

    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(
        "This email contains charts best viewed in an HTML-capable client.", "plain", "utf-8"
    ))
    alt.attach(MIMEText(html_body, "html", "utf-8"))
    msg.attach(alt)

    for cid, png_bytes in chart_images.items():
        if not png_bytes:
            continue
        image = MIMEImage(png_bytes, _subtype="png")
        image.add_header("Content-ID", f"<{cid}>")
        image.add_header("Content-Disposition", "inline", filename=f"{cid}.png")
        msg.attach(image)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(gmail_address, gmail_app_password)
        server.sendmail(gmail_address, recipient, msg.as_string())
