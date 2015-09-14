from binascii import b2a_hex


def determine_image_type (stream_first_4_bytes):
    """Find out the image file type based on the magic number comparison of the first 4 (or 2) bytes"""
    file_type = 'jpeg'
    bytes_as_hex = b2a_hex(stream_first_4_bytes)
    if bytes_as_hex.startswith('ffd8'):
        file_type = 'jpeg'
    elif bytes_as_hex == '89504e47':
        file_type = 'png'
    elif bytes_as_hex == '47494638':
        file_type = 'gif'
    elif bytes_as_hex.startswith('424d'):
        file_type = 'bmp'
    return file_type


def encode_image(lt_image):
    """Try to save the image data from this LTImage object, and return the file name, if successful"""
    result = None
    if lt_image.stream:
        file_stream = lt_image.stream.get_rawdata()
        if file_stream:
            file_ext = determine_image_type(file_stream[0:4])
            result = 'data:image/%s;base64,%s' % (file_ext, file_stream.encode('base64'))
    return result