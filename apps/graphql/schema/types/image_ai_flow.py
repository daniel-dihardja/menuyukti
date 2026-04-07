import strawberry
from strawberry.scalars import JSON


@strawberry.type
class ImageAiFlowType:
    id: int
    slug: str
    display_name: str
    prompt: str
    model: str
    prompt_enhance: str | None
    image_reference_strength: str | None
    style_ids: JSON | None
    is_active: bool
    sort_order: int
