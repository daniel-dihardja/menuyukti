# Story 80: Add Heatmap Filtering and Segmentation Controls

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 78

## Goal
Introduce high-value filters and segmentation controls to reduce noise and speed decision-making on heatmap views.

## Why This Matters
- Large menu sets make current matrix hard to prioritize.
- Marketers and analysts need focused slices (top items, categories, weekdays vs weekends).

## Scope
- Add controls for:
  - menu search
  - top-N rows
  - category filter (when available)
  - weekday/weekend segmentation toggle
  - sort by selected time bucket or total demand
- Add URL state serialization so filters are shareable.
- Add reset behavior and meaningful empty states.

## Acceptance Criteria
- Users can isolate relevant rows without manual scanning of full matrix.
- URL state reproduces the same filtered heatmap view.
- Filter performance remains responsive on realistic dataset sizes.

## Deliverables
- Heatmap filter bar and URL-state utility.
- Filter engine helpers + unit tests.
