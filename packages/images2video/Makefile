.PHONY: help video preview-all slideshow parallax list-effects clean

IMAGE ?= fixtures/single/pic-13.webp
EFFECT ?= ken-burns
OUTPUT ?=
BG ?= fixtures/parallax/bg.webp
FG ?= fixtures/parallax/fg.png
IMAGES ?= fixtures/slideshow/slide-01.webp fixtures/slideshow/slide-02.webp fixtures/slideshow/slide-03.webp
DURATION ?=
FOCAL_X ?=
FOCAL_Y ?=
LUT ?=

RENDER_ARGS = ./scripts/render.sh $(EFFECT)
ifneq ($(strip $(IMAGE)),)
RENDER_ARGS += --image "$(IMAGE)"
endif
ifneq ($(strip $(OUTPUT)),)
RENDER_ARGS += --output "$(OUTPUT)"
endif
ifneq ($(strip $(DURATION)),)
RENDER_ARGS += --duration "$(DURATION)"
endif

help:
	@echo "images2video — motion effects for still food photos"
	@echo ""
	@echo "  make list-effects"
	@echo "  make video EFFECT=ken-burns IMAGE=fixtures/single/pic-13.webp"
	@echo "  make preview-all IMAGE=fixtures/single/pic-13.webp"
	@echo "  make slideshow"
	@echo "  make parallax BG=fixtures/parallax/bg.webp FG=fixtures/parallax/fg.png"
	@echo "  make clean"
	@echo ""
	@echo "Effects: ken-burns zoom-punch color-grade vignette-pulse cross-dissolve parallax"

video:
	$(RENDER_ARGS)

preview-all:
	./scripts/render-all.sh --image "$(IMAGE)" $(if $(DURATION),--duration "$(DURATION)",)

slideshow:
	./scripts/render.sh cross-dissolve --images "$(IMAGES)" $(if $(OUTPUT),--output "$(OUTPUT)",) $(if $(DURATION),--duration "$(DURATION)",)

parallax:
	./scripts/render.sh parallax --bg "$(BG)" --fg "$(FG)" $(if $(OUTPUT),--output "$(OUTPUT)",) $(if $(DURATION),--duration "$(DURATION)",)

list-effects:
	./scripts/list-effects.sh

clean:
	rm -rf output/
