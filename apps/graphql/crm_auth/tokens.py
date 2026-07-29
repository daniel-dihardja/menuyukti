"""Shared helpers for CRM enrollment tokens, refresh tokens, and phone identifiers."""

from __future__ import annotations

import hashlib
import re
import secrets

_E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")
_ED25519_HEX_RE = re.compile(r"^[0-9a-fA-F]{64}$")


def hash_opaque_token(raw_token: str) -> str:
    """Return SHA-256 hex digest of an opaque token (enrollment or refresh)."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def hash_enrollment_token(raw_token: str) -> str:
    """Return SHA-256 hex digest of a raw enrollment token."""
    return hash_opaque_token(raw_token)


def generate_refresh_token() -> str:
    """Generate a high-entropy opaque refresh token (returned once to the client)."""
    return secrets.token_urlsafe(32)


def normalize_phone_e164(phone: str) -> str:
    """Strip whitespace and validate E.164 (+ and 7–15 digits)."""
    cleaned = phone.strip().replace(" ", "")
    if not _E164_RE.match(cleaned):
        raise ValueError("phoneE164 must be a valid E.164 number")
    return cleaned


def mask_phone_e164(phone: str | None) -> str:
    """Mask middle digits for staff UI (keep country code prefix and last 2)."""
    if not phone:
        return "—"
    if len(phone) <= 4:
        return "****"
    return f"{phone[:3]}***{phone[-2:]}"


def build_enroll_url(*, token: str, app_id: str) -> str:
    """Deep link for mobile enrollment QR / paste."""
    return f"menuyukti://enroll?token={token}&app={app_id}"


def normalize_ed25519_public_key_hex(public_key: str) -> str:
    """Validate and return lowercase hex Ed25519 public key (32 bytes / 64 hex chars)."""
    cleaned = public_key.strip().lower()
    if not _ED25519_HEX_RE.match(cleaned):
        raise ValueError("publicKey must be a 64-character hex-encoded Ed25519 public key")
    return cleaned
