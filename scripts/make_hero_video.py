"""Build the GOTRAJET hero background montage: load -> travel -> deliver.

Usage: python scripts/make_hero_video.py <source clips dir> dist/assets/video
Requires: pip install imageio-ffmpeg (bundles ffmpeg with libx264 and libvpx-vp9).
Download the 1920x1080 sources into <source clips dir> first:
  https://videos.pexels.com/video-files/4169253/4169253-hd_1920_1080_25fps.mp4
  https://videos.pexels.com/video-files/10251672/10251672-hd_1920_1080_30fps.mp4
  https://videos.pexels.com/video-files/6868105/6868105-hd_1920_1080_30fps.mp4
Clips (Pexels licence, free for commercial use, attribution not required):
  4169253 "A man placing the boxes inside the car" — Norma Mortenson
  10251672 "Van driving on road in mountains during sunset" — Matvey Ilyin
  6868105 "A delivery man ... delivers a package" — Kindel Media
"""
import subprocess, sys, pathlib
import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
SRC = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)

# (file, start, duration, extra grading)
SEGMENTS = [
    ("4169253-hd_1920_1080_25fps.mp4", 9.4, 5.0, "eq=saturation=0.9:contrast=1.04"),           # traveller loads parcels
    ("10251672-hd_1920_1080_30fps.mp4", 0.6, 6.0, "eq=brightness=0.07:gamma=1.25:saturation=1.1"),  # on the road at dusk
    ("6868105-hd_1920_1080_30fps.mp4", 4.4, 5.2, "eq=saturation=0.9:contrast=1.04"),           # handoff at destination
]
XF = 0.8  # cross-fade seconds


def build(width, height, name, crf_x264, crf_vp9):
    inputs, chains = [], []
    for i, (f, ss, t, grade) in enumerate(SEGMENTS):
        inputs += ["-ss", str(ss), "-t", str(t), "-i", str(SRC / f)]
        chains.append(
            f"[{i}:v]scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},"
            f"fps=25,{grade},setsar=1,format=yuv420p,settb=AVTB[v{i}]"
        )
    d0, d1, d2 = (s[2] for s in SEGMENTS)
    off1 = d0 - XF
    off2 = d0 + d1 - 2 * XF
    total = d0 + d1 + d2 - 2 * XF
    chains.append(f"[v0][v1]xfade=transition=fade:duration={XF}:offset={off1}[x1]")
    chains.append(f"[x1][v2]xfade=transition=fade:duration={XF}:offset={off2}[x2]")
    # soft dip into the brand navy at the loop point
    chains.append(f"[x2]fade=t=in:st=0:d=0.6:color=0x041e37,fade=t=out:st={total - 0.6}:d=0.6:color=0x041e37[out]")
    graph = ";".join(chains)
    mp4 = OUT / f"{name}.mp4"
    subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex", graph, "-map", "[out]",
                    "-an", "-c:v", "libx264", "-preset", "slow", "-crf", str(crf_x264), "-profile:v", "high",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4)], check=True)
    webm = OUT / f"{name}.webm"
    subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", str(mp4), "-an", "-c:v", "libvpx-vp9",
                    "-b:v", "0", "-crf", str(crf_vp9), "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", str(webm)], check=True)
    for f in (mp4, webm):
        print(f"{f.name:28} {f.stat().st_size / 1024:8.0f} KB  ({total:.1f}s)")
    return mp4


build(1280, 720, "hero-1280", 27, 38)   # desktop
build(854, 480, "hero-854", 29, 40)     # phones
