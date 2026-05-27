.PHONY: video

IMAGE ?= dish1.jpg
OUTPUT ?= output.mp4
FPS ?= 25
DURATION ?= 5
VIDEO_WIDTH ?= 1080
VIDEO_HEIGHT ?= 1920
MASK_WIDTH ?= 1080
MASK_HEIGHT ?= 1080
SOURCE_WIDTH ?= 4000
ZOOM_STEP ?= 0.0015
MAX_ZOOM ?= 1.5
CRF ?= 18
BG_COLOR ?= black
FRAME_COUNT = $(shell expr $(FPS) \* $(DURATION))

video:
	ffmpeg -y -loop 1 -i "$(IMAGE)" -filter_complex "color=c=$(BG_COLOR):s=$(VIDEO_WIDTH)x$(VIDEO_HEIGHT):r=$(FPS):d=$(DURATION)[bg];[0:v]scale=$(SOURCE_WIDTH):-1:flags=lanczos,zoompan=z='min(zoom+$(ZOOM_STEP),$(MAX_ZOOM))':d=$(FRAME_COUNT):x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=$(MASK_WIDTH)x$(MASK_HEIGHT):fps=$(FPS)[fg];[bg][fg]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1,format=yuv420p[v]" -map "[v]" -t $(DURATION) -pix_fmt yuv420p -c:v libx264 -crf $(CRF) "$(OUTPUT)"
