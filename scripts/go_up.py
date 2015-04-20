import os

# Delete down status indicator file if it exists
try:
    os.remove('down_lock')
except Exception, e:
    pass
