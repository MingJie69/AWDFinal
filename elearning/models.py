from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        (1, 'Student'),
        (2, 'Teacher'),
    )
    user_type = models.PositiveSmallIntegerField(choices=USER_TYPE_CHOICES, default=1)
    full_name = models.CharField(max_length=150, blank=True)
    photo = models.ImageField(upload_to='profile_pics/', default='profile_pics/default.png', null=True, blank=True)
    status = models.CharField(max_length=255, blank=True, default="No status yet")

    def __str__(self):
        return self.username

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()

    def __str__(self):
        return self.title

class TeacherProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    teaching_courses = models.ManyToManyField(Course, blank=True)

    def __str__(self):
        return f"Teacher: {self.user.username}"

class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    enrolled_courses = models.ManyToManyField(Course, blank=True)

    def __str__(self):
        return f"Student: {self.user.username}"

class Assignment(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='assignments')
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'user_type': 2})
    title = models.CharField(max_length=200)
    description = models.TextField()
    material = models.FileField(upload_to='assignments/', null=True, blank=True) 
    deadline = models.DateTimeField() 
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['deadline']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Feedback(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='feedbacks')
    student = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'user_type': 1})
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class ChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['timestamp']

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']