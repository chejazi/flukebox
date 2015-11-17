import tornado.ioloop
import tornado.web

from datetime import datetime

# length of the mp3 file (for looping)
audio_length_ms = 203624.0


class TimeHandler(tornado.web.RequestHandler):
    def get(self):

        # unix timestamp
        current_time_ms = (
            datetime.now() - datetime(1970, 1, 1)
        ).total_seconds() * 1000.

        self.write(
            {
                "server_time": current_time_ms,
                "play_position": current_time_ms % audio_length_ms
            }
        )

application = tornado.web.Application(
    [
        (r"/time", TimeHandler),
        (r"/(.*)", tornado.web.StaticFileHandler, {'path': ''}),
    ],
    debug=True
)

application.listen(9999)
tornado.ioloop.IOLoop.instance().start()
