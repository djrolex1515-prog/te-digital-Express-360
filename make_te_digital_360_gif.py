from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
OUTPUTS = ROOT / "frontend" / "outputs"
IMAGES = ROOT / "frontend" / "Imagenes"
PREVIEW = OUTPUTS / "te-digital-360-preview.png"
DEMO = OUTPUTS / "te-digital-360-demo.gif"
LIVE_DEMO = IMAGES / "te-digital-360-demo.gif"

W, H = 1080, 675
INK = "#182033"
MUTED = "#617083"
NAVY = "#16365f"
NAVY_DARK = "#0f2748"
RED = "#c83f49"
TEAL = "#1f8a8a"
GOLD = "#c6942f"
GREEN = "#2e8f63"
SOFT = "#f4f7fb"
WHITE = "#ffffff"
LINE = "#dbe3ee"


def font(size, bold=False):
    names = ["segoeuib.ttf", "arialbd.ttf"] if bold else ["segoeui.ttf", "arial.ttf"]

    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size=size)

    return ImageFont.load_default()


FONT_XS = font(14)
FONT_SM = font(18)
FONT_CARD = font(20, bold=True)
FONT_MD = font(28, bold=True)
FONT_LG = font(46, bold=True)
FONT_HERO = font(58, bold=True)


def rounded(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, fill=INK, font_obj=FONT_SM, anchor=None):
    draw.text(xy, value, fill=fill, font=font_obj, anchor=anchor)


def progress_bar(draw, x, y, width, color, progress):
    rounded(draw, (x, y, x + width, y + 10), 8, "#e6edf5")
    rounded(draw, (x, y, x + int(width * progress), y + 10), 8, color)


def service_card(draw, x, y, title, subtitle, badge, color, progress):
    rounded(draw, (x, y, x + 330, y + 92), 10, WHITE, LINE, 2)
    rounded(draw, (x + 20, y + 24, x + 66, y + 58), 8, color)
    text(draw, (x + 43, y + 31), badge, WHITE, FONT_XS, "ma")
    text(draw, (x + 82, y + 20), title, INK, FONT_CARD)
    text(draw, (x + 82, y + 49), subtitle, MUTED, FONT_XS)
    progress_bar(draw, x + 20, y + 72, 290, color, progress)


def draw_dashboard(progress=0.75, active_step=2):
    image = Image.new("RGB", (W, H), SOFT)
    draw = ImageDraw.Draw(image)

    rounded(draw, (32, 28, W - 32, H - 28), 8, WHITE, LINE, 2)
    rounded(draw, (32, 28, W - 32, 98), 8, NAVY_DARK)
    draw.rectangle((32, 70, W - 32, 98), fill=NAVY_DARK)

    for x, color in [(60, RED), (84, GOLD), (108, TEAL)]:
        draw.ellipse((x, 58, x + 12, 70), fill=color)

    rounded(draw, (760, 48, 1012, 78), 7, "#2f5688")
    text(draw, (886, 55), "Buscar trámite o servicio", WHITE, FONT_XS, "ma")

    text(draw, (62, 138), "TE", NAVY_DARK, FONT_HERO)
    text(draw, (62, 196), "Digital", NAVY_DARK, FONT_HERO)
    text(draw, (62, 254), "Express", NAVY_DARK, FONT_HERO)
    text(draw, (62, 312), "360", NAVY_DARK, FONT_HERO)
    text(draw, (64, 378), "Portal institucional para", MUTED, FONT_SM)
    text(draw, (64, 405), "servicios ciudadanos", MUTED, FONT_SM)

    rounded(draw, (292, 138, 420, 196), 8, TEAL)
    text(draw, (356, 154), "Panel", WHITE, FONT_CARD, "ma")
    text(draw, (356, 178), "Funcionario", WHITE, FONT_XS, "ma")

    service_card(draw, 62, 430, "Cédula / BioCed", "Identidad y biometría", "ID", NAVY, 0.72)
    service_card(draw, 430, 430, "Registro Civil", "Actas y certificados", "RC", TEAL, 0.64)
    service_card(draw, 62, 530, "Oficinas y Quioscos", "Ubicaciones y turnos", "OQ", GOLD, 0.58)
    service_card(draw, 430, 530, "Solicitud ciudadana", "Registro inicial", "TE", RED, progress)

    text(draw, (804, 138), "SEGUIMIENTO", RED, FONT_XS)
    steps = [
        ("Recibida", GREEN),
        ("Validada", GREEN),
        ("En impresión", TEAL),
        ("Retiro", MUTED),
    ]

    for index, (label, color) in enumerate(steps):
        y = 180 + index * 56

        if index == active_step:
            rounded(draw, (790, y - 14, 1012, y + 26), 7, "#e9fafa")

        draw.ellipse((804, y - 2, 820, y + 14), fill=color)
        text(draw, (836, y - 7), label, color if index <= active_step else MUTED, FONT_CARD)

    rounded(draw, (760, 410, 1018, 548), 8, NAVY)
    text(draw, (784, 430), "Seguimiento", WHITE, FONT_CARD)
    text(draw, (784, 456), "disponible", WHITE, FONT_CARD)
    text(draw, (784, 488), "El ciudadano podrá consultar", "#d6e0ec", FONT_XS)
    text(draw, (784, 508), "el próximo paso de su trámite.", "#d6e0ec", FONT_XS)

    return image


def main():
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    IMAGES.mkdir(parents=True, exist_ok=True)

    preview = draw_dashboard(0.82, 2)
    preview.save(PREVIEW, "PNG", optimize=True)

    frames = [
        draw_dashboard(0.42, 0),
        draw_dashboard(0.58, 1),
        draw_dashboard(0.82, 2),
        draw_dashboard(0.95, 3),
        draw_dashboard(0.82, 2),
    ]

    frames[0].save(
        DEMO,
        save_all=True,
        append_images=frames[1:],
        duration=850,
        loop=0,
        optimize=True,
    )

    frames[0].save(
        LIVE_DEMO,
        save_all=True,
        append_images=frames[1:],
        duration=850,
        loop=0,
        optimize=True,
    )

    print(f"Creado: {PREVIEW}")
    print(f"Creado: {DEMO}")
    print(f"Creado: {LIVE_DEMO}")


if __name__ == "__main__":
    main()
