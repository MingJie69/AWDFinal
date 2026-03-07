import os
from pathlib import Path

# 基础路径定义
BASE_DIR = Path(__file__).resolve().parent.parent

# --- 1. 安全配置 ---
# 在服务器上，将 DEBUG 设为 False
DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'

# 密钥必须从环境变量读取，不要硬编码在代码里
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'your-production-secret-key-here')

# 允许服务器的域名和 IP 访问
ALLOWED_HOSTS = [
    '127.0.0.1', 
    'localhost', 
    os.environ.get('SERVER_DOMAIN', ''), # 你的域名
    os.environ.get('SERVER_IP', '')      # 你的服务器公网 IP
]

# --- 2. 应用定义 ---
INSTALLED_APPS = [
    'daphne',  # 必须在第一位以支持 ASGI
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_celery_results',
    'rest_framework',
    'drf_yasg', 
    'channels', # 实时通讯核心
    'elearning', 
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # 强烈建议：生产环境静态文件支持
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'final.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# --- 3. 异步与服务器配置 ---
WSGI_APPLICATION = 'final.wsgi.application'
ASGI_APPLICATION = 'final.asgi.application' # 确保指向 asgi.py

# --- 4. 数据库配置 (PostgreSQL) ---
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'elearningdb'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'Jiejie87'),
        'HOST': os.environ.get('DB_HOST', 'db'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# --- 5. Redis 通道层 (用于 WebSockets) ---
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            # 生产环境 Redis 地址
            "hosts": [os.environ.get('REDIS_URL', 'redis://redis:6379/0')],
        },
    },
}

# --- 6. 自定义用户模型 ---
AUTH_USER_MODEL = 'elearning.User' # 对应你的 elearning.User

# --- 7. 静态与媒体文件 ---
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles' # collectstatic 命令的输出目录
STATICFILES_DIRS = [
    BASE_DIR / "elearning" / "static",
]

# 生产环境静态文件压缩
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media' # 老师上传的资料存储位置

CSRF_TRUSTED_ORIGINS = [
    f"http://{os.environ.get('SERVER_DOMAIN', 'localhost')}",
    f"https://{os.environ.get('SERVER_DOMAIN', 'localhost')}",
    f"http://{os.environ.get('SERVER_IP', '165.245.176.218')}",
    "http://165.245.176.218",
    "http://127.0.0.1:8000"
]

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 国际化
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True