from PIL import Image, ImageDraw, ImageFont
import os, math

out = r"C:\Users\sheep8898\Documents\deepseek-harness\default-workspace\work\prj_facultyrecords_a220564\prj_facultyrecords_a220564\bin\Debug\pictures"
os.makedirs(out, exist_ok=True)

students = [
    ("A101", "Ahmad"),
    ("A103", "Siti"),
    ("A104", "Lim"),
    ("A105", "Raja"),
    ("A106", "Anna"),
    ("A107", "Abu"),
]

W, H = 300, 400
bg_colors = [(214, 228, 240), (222, 235, 224), (235, 226, 214), (225, 220, 238), (214, 235, 235), (238, 222, 226)]
sil_colors = [(120, 150, 180), (120, 165, 130), (170, 140, 110), (140, 125, 175), (100, 160, 165), (175, 120, 135)]

font_bold = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 28)
font_small = ImageFont.truetype(r"C:\Windows\Fonts\segoeui.ttf", 20)


def rounded_rect(draw, box, r, fill):
    draw.rounded_rectangle(box, radius=r, fill=fill)


for i, (matric, name) in enumerate(students):
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    # background gradient
    top, bottom = bg_colors[i], (255, 255, 255)
    for y in range(H):
        t = y / H
        c = tuple(int(top[k] * (1 - t) + bottom[k] * t) for k in range(3))
        d.line([(0, y), (W, y)], fill=c)
    # shoulders
    d.ellipse([30, 250, W - 30, 470], fill=sil_colors[i])
    # neck
    d.rectangle([125, 215, 175, 275], fill=sil_colors[i])
    # head
    d.ellipse([90, 70, 210, 230], fill=sil_colors[i])
    # hair cap
    d.chord([88, 62, 212, 200], 180, 360, fill=tuple(max(0, v - 55) for v in sil_colors[i]))
    # border
    d.rectangle([0, 0, W - 1, H - 1], outline=(150, 150, 150), width=3)
    # caption area
    d.rectangle([0, 320, W, H], fill=(255, 255, 255))
    d.line([(0, 320), (W, 320)], fill=(180, 180, 180), width=2)
    tw = d.textlength(name, font=font_bold)
    d.text(((W - tw) / 2, 332), name, font=font_bold, fill=(40, 40, 40))
    tw2 = d.textlength(matric, font=font_small)
    d.text(((W - tw2) / 2, 368), matric, font=font_small, fill=(90, 90, 90))
    img.save(os.path.join(out, f"{matric}.jpg"), "JPEG", quality=90)
    print("saved", matric)
