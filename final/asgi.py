import os
import django # 必须导入 django
from django.core.asgi import get_asgi_application

# 1. 设置环境变量
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'final.settings')

# 2. 关键：必须在导入任何 routing 或 models 之前调用 django.setup()
django.setup()

# 3. 现在可以安全地导入业务代码了
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import elearning.routing 

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            elearning.routing.websocket_urlpatterns
        )
    ),
})