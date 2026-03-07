from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'courses', views.CourseViewSet)

urlpatterns = [
    path('', views.login_page_view, name='login-page'),
    path('home/', views.index_view, name='index'),

    path('api/auth/register/', views.register_user, name='api-register'),
    path('api/auth/login/', views.login_view, name='api-login'),
    path('api/auth/logout/', views.logout_view, name='api-logout'),

    path('api/home/', views.home_page_data, name='api-home-data'),
    path('api/status/update/', views.update_status, name='api-status-update'),

    path('api/teacher/my-courses/', views.get_teacher_courses, name='api-teacher-courses'),
    path('api/teacher/select-course/', views.teacher_select_course, name='api-select-course'),
    path('api/teacher/create-course/', views.create_course, name='api-create-course'),
    path('api/teacher/publish-assignment/', views.publish_assignment, name='api-publish-assignment'),
    path('api/teacher/search-users/', views.search_users, name='api-teacher-search'),
    path('api/teacher/course-students/<int:course_id>/', views.view_course_students, name='api-course-students'),

    path('api/course/<int:course_id>/feedback/', views.post_feedback, name='post-feedback'),
    path('api/student/enroll/<int:course_id>/', views.enroll_in_course, name='api-enroll'),

    path('api/chat/send/', views.send_message, name='chat-send'),
    path('api/chat/history/<int:other_user_id>/', views.get_chat_history, name='chat-history'),
    path('api/course/<int:course_id>/students/', views.view_course_students, name='view_course_students'),
    path('api/notifications/', views.get_notifications, name='get_notifications'),
    path('api/user/<int:user_id>/profile/', views.get_user_profile),
    path('api/auth/change-password/', views.change_password, name='change-password'),
    path('api/auth/update-profile/', views.update_profile_settings),
    path('api/courses/<int:course_id>/remove-student/<int:student_id>/', views.remove_student_from_course),
    path('api/course/<int:course_id>/all-feedback/', views.view_course_feedback),

    path('api/', include(router.urls)),
]