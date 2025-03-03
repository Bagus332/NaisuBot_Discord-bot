import sys
import json
from PIL import Image
from io import BytesIO
import base64

def process_image(image_data):
    image_bytes = base64.b64decode(image_data)
    image = Image.open(BytesIO(image_bytes))
    # Example processing: resize the image
    resized_image = image.resize((128, 128))
    buffered = BytesIO()
    resized_image.save(buffered, format="JPEG")
    resized_image_data = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return resized_image_data

if __name__ == "__main__":
    input_data = json.loads(sys.argv[1])
    image_data = input_data["image_data"]
    resized_image_data = process_image(image_data)
    result = {
        "status": "success",
        "resized_image": resized_image_data
    }
    print(json.dumps(result))