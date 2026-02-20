"""
Agent: Consensus Ranking

Rank menu candidates based on consensus scoring across multiple indicators.

Pure function (no frameworks). Used by apps/agents/consensus.py for signal generation.
"""


def rank_consensus_candidates(
    candidates: list[dict],
    profit_data: dict,
    volume_data: dict,
) -> list[dict]:
    """
    Rank menu candidates based on consensus scoring.
    
    TODO: Extract logic from apps/agents/src/agent/consensus.py
    
    Args:
        candidates: List of candidate menu items
        profit_data: Profit metrics per item
        volume_data: Volume metrics per item
        
    Returns:
        Ranked list of candidates with consensus scores
    """
    pass
