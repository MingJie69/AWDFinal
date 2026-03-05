# final/celery.py
import os
from celery import Celery

# 为 celery 命令设置默认的 Django settings 模块
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'final.settings')

app = Celery('final')

# 使用字符串，这样工作进程就不需要序列化配置对象
# namespace='CELERY' 表示所有的 Celery 配置键都必须以 'CELERY_' 开头
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动从所有已注册的 Django app 中加载任务 (找 tasks.py)
app.autodiscover_tasks()