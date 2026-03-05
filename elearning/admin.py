from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Course, Feedback, TeacherProfile, StudentProfile, Assignment, ChatMessage, Notification

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'full_name', 'user_type', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('user_type', 'full_name', 'photo', 'status_update')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('user_type', 'full_name', 'photo', 'status_update')}),
    )

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'created_at', 'is_read')

    list_filter = ('is_read', 'created_at', 'user')

    search_fields = ('message', 'user__username')

admin.site.register(User)
admin.site.register(Course)
admin.site.register(StudentProfile)
admin.site.register(TeacherProfile)
admin.site.register(Feedback)
admin.site.register(Assignment)
admin.site.register(ChatMessage)