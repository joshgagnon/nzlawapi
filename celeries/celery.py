from __future__ import absolute_import

from celery import Celery

# instantiate Celery object
app = Celery(include=[
                         'celeries.tasks'
                        ])

# import celery config file
app.config_from_object('celeryconfig')

if __name__ == '__main__':
    app.start()