"""
Registry of POS normalizer functions.

HOW TO ADD A NEW POS SYSTEM:
============================
1. Add POS config to menuyukti/core/models/pos_mapping.py:

   POS_CONFIG["toast"] = ("toast", 0, {
       "check_id": "bill_number",
       "item_name": "menu",
       "quantity": "qty"
   })

2. Add normalizer function here (or reuse generic one):

   NORMALIZERS["toast"] = normalize_toast_excel

That's it! Your POS is now:
- Auto-detected (via pattern in POS_CONFIG)
- Auto-normalized (via NORMALIZERS function)
"""

# Empty registry - normalizers are registered lazily to avoid circular imports
NORMALIZERS = {}


def register_normalizers():
    """Lazy registration to avoid circular imports"""
    if not NORMALIZERS:
        from menuyukti.indicators.analytics.esb.normalizer import normalize_esb_excel

        NORMALIZERS["esb"] = normalize_esb_excel
