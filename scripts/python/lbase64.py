from PIL import Image
import base64
import os
import mimetypes

# Imagen original
input_image = "Gemini_Generated_Image_53jryp53jryp53jr.png"

# SVG de salida
output_svg = "assets/backgrounds/mexico-bg.svg"

# Abrir imagen para obtener medidas
img = Image.open(input_image)
width, height = img.size

# Detectar tipo MIME
mime_type, _ = mimetypes.guess_type(input_image)

if mime_type is None:
    mime_type = "image/png"

# Convertir imagen a base64
with open(input_image, "rb") as file:
    encoded = base64.b64encode(file.read()).decode("utf-8")

# Crear SVG con la imagen embebida
svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg"
     width="{width}"
     height="{height}"
     viewBox="0 0 {width} {height}"
     preserveAspectRatio="xMidYMid slice">
  <image
    href="data:{mime_type};base64,{encoded}"
    width="{width}"
    height="{height}"
    x="0"
    y="0"
    preserveAspectRatio="xMidYMid slice" />
</svg>
'''

# Guardar SVG
os.makedirs(os.path.dirname(output_svg), exist_ok=True)

with open(output_svg, "w", encoding="utf-8") as file:
    file.write(svg_content)

original_size = os.path.getsize(input_image) / (1024 * 1024)
svg_size = os.path.getsize(output_svg) / (1024 * 1024)

print("SVG generado correctamente.")
print(f"Imagen original: {input_image}")
print(f"SVG salida: {output_svg}")
print(f"Medidas: {width} x {height}")
print(f"Peso imagen original: {original_size:.2f} MB")
print(f"Peso SVG: {svg_size:.2f} MB")