from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, StudentProfile, TeacherProfile

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        if instance.user_type == 1:
            StudentProfile.objects.get_or_create(user=instance)
        elif instance.user_type == 2:
            TeacherProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if instance.user_type == 1 and hasattr(instance, 'student_profile'):
        instance.student_profile.save()
    elif instance.user_type == 2 and hasattr(instance, 'teacher_profile'):
        instance.teacher_profile.save()