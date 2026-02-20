"""
Restaurant optimization agents - deterministic decision-making indicators.

This module contains pure, framework-agnostic implementations of restaurant
optimization agents. Each agent represents a deterministic indicator or scoring
function that can be used independently or in combination.

No FastAPI, no LangGraph, no LLM dependencies - just pure Python functions
for calculating restaurant optimization indicators.

Agents:
    - consensus: Rank menu items based on consensus scoring
    - learning_eligibility: Determine if menu item is ready for learning/optimization
    - simulation: Simulate impact of menu changes
    - rerank: Re-rank items based on multiple criteria
    - release_loop: Manage menu item promotion/demotion through lifecycle
    - strategist: Generate strategy for menu optimization

Example:
    from menuyukti.orchestration import consensus

    rankings = consensus.rank_consensus_candidates(
        candidates=menu_items,
        profit_data=profits,
        volume_data=volumes
    )
"""
