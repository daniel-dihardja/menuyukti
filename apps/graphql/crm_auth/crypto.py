"""Ed25519 public-key verification for CRM device auth."""

from __future__ import annotations

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


def verify_ed25519_signature(*, public_key_hex: str, message: bytes, signature_hex: str) -> bool:
    """
    Verify an Ed25519 signature.

    ``public_key_hex`` and ``signature_hex`` are lowercase or mixed hex strings.
    ``message`` is the raw bytes that were signed (UTF-8 of the challenge nonce).
    """
    try:
        public_key_bytes = bytes.fromhex(public_key_hex.strip())
        signature_bytes = bytes.fromhex(signature_hex.strip())
    except ValueError:
        return False
    if len(public_key_bytes) != 32 or len(signature_bytes) != 64:
        return False
    try:
        key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
        key.verify(signature_bytes, message)
    except (InvalidSignature, ValueError):
        return False
    return True
