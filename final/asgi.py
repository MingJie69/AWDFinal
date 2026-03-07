import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import elearning.routing # 我们下一步会创建这个文件

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'final.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(), # 处理普通的 HTTP 请求
    "websocket": AuthMiddlewareStack(
        URLRouter(
            elearning.routing.websocket_urlpatterns # 处理 WebSocket 请求
        )
    ),
})