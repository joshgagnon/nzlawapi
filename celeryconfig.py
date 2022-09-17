# config file for Celery Daemon

# default RabbitMQ broker
BROKER_URL = 'amqp://localhost'

# default RabbitMQ backend
CELERY_RESULT_BACKEND = 'amqp://localhost'

CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT=['json']
CELERY_IGNORE_RESULT = True
CELERY_TASK_RESULT_EXPIRES = 1000