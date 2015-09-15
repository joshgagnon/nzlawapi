from binascii import b2a_hex
from PIL import Image, ImageChops
import StringIO
from pdfminer.image import BMPWriter
from pdfminer.pdftypes import LITERALS_DCT_DECODE
from pdfminer.pdfcolor import LITERAL_DEVICE_GRAY, LITERAL_DEVICE_RGB, LITERAL_DEVICE_CMYK

from io import BytesIO


def export_image(image):
    stream = image.stream
    (width, height) = image.srcsize
    filters = stream.get_filters()
    fp = StringIO.StringIO()
    if len(filters) == 1 and filters[0] in LITERALS_DCT_DECODE:
        ext = 'jpg'
    else:
        ext = 'img'
    if ext == 'jpg':
        raw_data = stream.get_rawdata()
        if LITERAL_DEVICE_CMYK in image.colorspace:
            ifp = BytesIO(raw_data)
            i = Image.open(ifp)
            i = ImageChops.invert(i)
            i = i.convert('RGB')
            i.save(fp, 'JPEG')
        else:
            fp.write(raw_data)
    elif image.bits == 1:
        i = Image.fromstring('1', image.srcsize, stream.get_data())
        i.save(fp, 'PNG')
        ext = 'png'
    elif image.bits == 8 and image.colorspace[0] is LITERAL_DEVICE_RGB:
        i = Image.fromstring('RGB', image.srcsize, stream.get_data())
        i.save(fp, 'PNG')
        ext = 'png'
    elif image.bits == 8 and image.colorspace[0] is LITERAL_DEVICE_GRAY:
        i = Image.fromstring('L',image.srcsize, stream.get_data())
        i.save(fp, 'PNG')
        ext = 'png'
    else:
        fp.write(stream.get_data())
        bytes_as_hex = b2a_hex(stream.get_rawdata()[:4])
        if bytes_as_hex == '89504e47':
            ext = 'png'
        elif bytes_as_hex == '47494638':
            ext = 'gif'
        elif bytes_as_hex.startswith('424d'):
            ext = 'bmp'
    fp.seek(0)

    return ext, fp.read()


def determine_image_type (stream):
    file_type = 'png'
    bytes_as_hex = b2a_hex(stream[:4])
    #if bytes_as_hex[:4] in ['7801', '789c', '78da']:
    #    return determine_image_type(first_bytes, zlib.decompress(stream))

    if bytes_as_hex.startswith('ffd8'):
        file_type = 'jpeg'
    elif bytes_as_hex == '89504e47':
        file_type = 'png'
    elif bytes_as_hex == '47494638':
        file_type = 'gif'
    elif bytes_as_hex.startswith('424d'):
        file_type = 'bmp'
    else:
        Image.open(StringIO.StringIO(stream))
    return file_type, stream



def encode_image(lt_image):
    """Try to save the image data from this LTImage object, and return the file name, if successful"""
    result = None
    if lt_image.stream:
        file_stream = lt_image.stream
        if file_stream:
            file_ext, file_stream = export_image(lt_image)
            result = 'data:image/%s;base64,%s' % (file_ext, file_stream.encode('base64'))
    return result