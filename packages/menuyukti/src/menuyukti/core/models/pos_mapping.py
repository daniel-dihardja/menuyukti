"""
POS system configuration registry.

Add new POS systems by adding a tuple: (detection_pattern, skip_rows, rename_map)
ESB column names are the canonical schema - other POS systems map to them.
"""

# POS_CONFIG: {pos_name: (detection_pattern, skip_rows, {pos_col: canonical_col})}
POS_CONFIG = {
    "esb": ("sales recapitulation", 11, {}),  # ESB = canonical, no rename needed
    "quino": ("quino_transaction_detail", 0, {}),
    # Add new POS systems here:
    # "toast": ("toast", 0, {"check_id": "bill_number", "item_name": "menu", "quantity": "qty"}),
    # "square": ("square", 1, {"order_id": "bill_number", "item": "menu"}),
}


def detect(cell_value: str) -> str:
    """
    Detect POS system from Excel cell A1 text.

    Returns POS system name or "unknown" if not recognized.
    """
    v = cell_value.lower()
    return next(
        (k for k, (pattern, _, _) in POS_CONFIG.items() if pattern in v), "unknown"
    )


def get_config(pos: str) -> tuple[int, dict[str, str]]:
    """
    Get configuration for a POS system.

    Returns:
        (skip_rows, rename_map) tuple
    """
    return POS_CONFIG[pos][1], POS_CONFIG[pos][2]
