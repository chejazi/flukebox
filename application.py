import tornado.ioloop
import tornado.web

from datetime import datetime
from sockjs.tornado import SockJSRouter, SockJSConnection

# length of the mp3 file (for looping)
audio_length_ms = 203624.0

def getTimestamp():
    # unix timestamp
    current_time_ms = (
        datetime.now() - datetime(1970, 1, 1)
    ).total_seconds() * 1000.

    return {
        "server_time": current_time_ms,
        "play_position": current_time_ms % audio_length_ms
    }



class SocketTimeHandler(SockJSConnection):

    def on_message(self, msg):
        self.send(getTimestamp())


    def check_origin(self, origin):
        return True

class AjaxTimeHandler(tornado.web.RequestHandler):
    def get(self):

        self.write(
            getTimestamp()
        )

SocketRouter = SockJSRouter(SocketTimeHandler, '/timeSocket')

application = tornado.web.Application(
    SocketRouter.urls +
    [
        (r"/time", AjaxTimeHandler),
        (r"/(.*)", tornado.web.StaticFileHandler, {'path': ''}),
    ],
    debug=True
)

application.listen(9999)
tornado.ioloop.IOLoop.instance().start()
