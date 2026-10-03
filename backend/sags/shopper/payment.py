"""Mock QPay. Swap for the organizers' sandbox transaction environment on 10/05."""

import uuid

from sags.contracts import now


def create_invoice(amount: int, ref: str) -> dict:
    invoice_id = f"inv_{uuid.uuid4().hex[:10]}"
    return {
        "invoice_id": invoice_id,
        "provider": "qpay-mock",
        "amount": amount,
        "ref": ref,
        "qr_text": f"sags://qpay/{invoice_id}?amount={amount}",
        "status": "pending",
        "created_at": now().isoformat(),
    }


def check_payment(invoice: dict) -> dict:
    """Sandbox: the user tapped "Төлөх" in the UI, so the invoice is paid."""
    return {**invoice, "status": "paid", "payment_ref": f"pay_{uuid.uuid4().hex[:10]}", "paid_at": now().isoformat()}
