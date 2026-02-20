# Mocked Input Fixture (Pilot Only)

Fields shared with PTL-10 test agent and the iteration loop:

- `scenario_id`: `pilot-brunch-001`
- `restaurant_name`: `Luminous Brunch Atelier`
- `menu_item`: `Golden Tartine`
- `target_audience`: `trend-conscious city professionals`
- `tone`: `premium`
- `objective`: `traffic`
- `price_band`: `premium`
- `daypart`: `brunch`
- `inventory_pressure`: `medium`
- `candidate_actions`: `["reserve", "try", "bookmark"]`
- `must_include_terms`: `["Golden Tartine", "Luminous Brunch Atelier"]`
- `forbidden_phrases`: `["cheap", "fast-food"]`
- `evidence_facts`: `["seasonal berries", "chef-curated"]`

Example usage:

```json
{
  "scenario_id": "pilot-brunch-001",
  "restaurant_name": "Luminous Brunch Atelier",
  "menu_item": "Golden Tartine",
  "target_audience": "trend-conscious city professionals",
  "tone": "premium",
  "objective": "traffic",
  "price_band": "premium",
  "daypart": "brunch",
  "inventory_pressure": "medium",
  "candidate_actions": ["reserve", "try", "bookmark"],
  "must_include_terms": ["Golden Tartine", "Luminous Brunch Atelier"],
  "forbidden_phrases": ["cheap", "fast-food"],
  "evidence_facts": ["seasonal berries", "chef-curated"]
}
```

Link this fixture from PTL-11 documentation so every iteration uses the documented input set when generating `output.json`.
