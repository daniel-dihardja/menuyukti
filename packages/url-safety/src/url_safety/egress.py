"""HTTPS egress URL validation and DNS resolution for SSRF mitigation (stdlib only)."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

_BLOCKED_HOSTNAMES = frozenset(
    {
        "localhost",
        "metadata",
        "metadata.google.internal",
    }
)


def _disallowed_egress_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    if ip.is_unspecified:
        return True
    if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast:
        return True
    if ip.is_reserved:
        return True
    return bool(ip.version == 4 and int(ip) == 0)


def host_is_literal_ip(host: str) -> bool:
    """True if ``host`` parses as an IPv4 or IPv6 address (not a DNS name)."""
    try:
        ipaddress.ip_address(host)
    except ValueError:
        return False
    else:
        return True


def parse_and_validate_egress_https_url(url: str) -> str:
    """Validate URL for allowed HTTPS egress target (registration-time checks, no DNS).

    Rejects http, credentials in userinfo, empty host, blocked hostnames, and non-public IP
    literals. Does not resolve DNS — use :func:`resolve_hostname_ips` at request time.
    """
    u = url.strip()
    if not u:
        msg = "URL is required"
        raise ValueError(msg)
    parsed = urlparse(u)
    if parsed.scheme.lower() != "https":
        msg = "URL must use https"
        raise ValueError(msg)
    if parsed.username is not None or parsed.password is not None:
        msg = "URL must not contain a username or password"
        raise ValueError(msg)
    host = parsed.hostname
    if not host:
        msg = "URL must include a valid host"
        raise ValueError(msg)

    host_lower = host.lower().rstrip(".")
    if host_lower in _BLOCKED_HOSTNAMES:
        msg = "Host is not allowed for API adapter URLs"
        raise ValueError(msg)
    if host_lower.endswith(".localhost"):
        msg = "Host is not allowed for API adapter URLs"
        raise ValueError(msg)
    if host_lower.endswith(".local"):
        msg = "Host is not allowed for API adapter URLs"
        raise ValueError(msg)

    if host_is_literal_ip(host):
        ip = ipaddress.ip_address(host)
        if _disallowed_egress_ip(ip):
            msg = "URL must not point to a private, loopback, or link-local address"
            raise ValueError(msg)

    return u


def assert_all_ips_are_public(ips: list[ipaddress.IPv4Address | ipaddress.IPv6Address]) -> None:
    """Raise ValueError if any address is not suitable for public HTTPS egress."""
    for ip in ips:
        if _disallowed_egress_ip(ip):
            msg = "Host resolves to a non-public IP address"
            raise ValueError(msg)


def resolve_hostname_ips(host: str) -> list[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    """Resolve a hostname to IPv4/IPv6 addresses (blocking)."""
    try:
        infos = socket.getaddrinfo(
            host,
            None,
            type=socket.SOCK_STREAM,
            proto=socket.IPPROTO_TCP,
        )
    except socket.gaierror as e:
        msg = f"Could not resolve hostname: {e}"
        raise ValueError(msg) from e

    out: list[ipaddress.IPv4Address | ipaddress.IPv6Address] = []
    seen: set[str] = set()
    for fam, _, _, _, sockaddr in infos:
        if fam not in (socket.AF_INET, socket.AF_INET6):
            continue
        addr = sockaddr[0]
        if addr in seen:
            continue
        seen.add(addr)
        ip = ipaddress.ip_address(addr)
        out.append(ip)
    if not out:
        msg = "Could not resolve hostname to an IP address"
        raise ValueError(msg)
    return out
