from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.decorators import login_required 
from django.utils import timezone
from django.db import models

from rest_framework.decorators import api_view, permission_classes 
from rest_framework.response import Response
from rest_framework import status, viewsets, generics
from rest_framework.permissions import AllowAny, IsAuthenticated

from django.db.models import Q
from .models import User, Course, Feedback, TeacherProfile, StudentProfile, Assignment, ChatMessage, Notification
from .serializers import UserSerializer, CourseSerializer, AssignmentSerializer

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

def login_page_view(request):
    if request.user.is_authenticated:
        return redirect('index')
    return render(request, 'elearning/login.html')

@login_required(login_url='/') 
def index_view(request):
    return render(request, 'elearning/index.html')

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    full_name = request.data.get('full_name')
    user_type = int(request.data.get('user_type', 1))
    photo = request.FILES.get('photo')

    try:
        user = User.objects.create_user(
            username=username,
            password=password,
            full_name=full_name,
            user_type=user_type
        )
        if photo:
            user.photo = photo
            user.save()
        return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    
    if user is not None:
        login(request, user)
        return Response({
            "message": "Login successful",
            "username": user.username,
            "user_type": user.user_type
        })
    return Response({"error": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({"message": "Logged out successfully"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def home_page_data(request):
    user = request.user
    user_serializer = UserSerializer(user)

    enrolled_course_ids = []
    display_courses = []
    upcoming_deadlines = []

    if user.user_type == 2:
        try:
            courses_qs = user.teacher_profile.teaching_courses.all()
            display_courses = CourseSerializer(courses_qs, many=True).data
        except:
            display_courses = []
        user_status = None 
        enrolled_course_ids = []
        upcoming_deadlines = []
            
    else:
        all_courses = Course.objects.all()
        display_courses = CourseSerializer(all_courses, many=True).data
        user_status = user.status
        
        try:
            enrolled_qs = user.student_profile.enrolled_courses.all()
            enrolled_course_ids = list(enrolled_qs.values_list('id', flat=True))
            
            deadlines_qs = Assignment.objects.filter(
                course__in=enrolled_qs,
                deadline__gt=timezone.now()
            ).order_by('deadline')[:5]
            upcoming_deadlines = AssignmentSerializer(deadlines_qs, many=True).data
        except:
            enrolled_course_ids = []
            upcoming_deadlines = []

    return Response({
        "user_info": user_serializer.data,
        "status": user_status,
        "courses": display_courses,
        "enrolled_ids": enrolled_course_ids,
        "upcoming_deadlines": upcoming_deadlines
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_status(request):
    if request.user.user_type == 2:
        return Response(
            {"error": "Unauthorized: Teachers do not have a status profile."}, 
            status=status.HTTP_403_FORBIDDEN
        )
    new_status = request.data.get('status')
    
    if not new_status:
        return Response({"error": "Status content cannot be empty"}, status=status.HTTP_400_BAD_REQUEST)

    request.user.status = new_status
    request.user.save()
    
    return Response({"message": "Status updated successfully!"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_courses(request):
    if request.user.user_type != 2:
        return Response({"error": "Teachers only"}, status=403)
    try:
        courses = request.user.teacher_profile.teaching_courses.all()
        data = [{"id": c.id, "title": c.title} for c in courses]
        return Response(data)
    except:
        return Response([])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def publish_assignment(request):
    if request.user.user_type != 2:
        return Response({"error": "Teachers only"}, status=403)

    course_id = request.data.get('course_id')
    title = request.data.get('title')
    description = request.data.get('description')
    deadline = request.data.get('deadline')
    material = request.FILES.get('material')

    if not all([course_id, title, deadline]):
        return Response({"error": "Missing required fields"}, status=400)

    try:
        course = Course.objects.get(id=course_id)
        
        Assignment.objects.create(
            course=course,
            teacher=request.user,
            title=title,
            description=description,
            deadline=deadline,
            material=material
        )

        students = StudentProfile.objects.filter(enrolled_courses=course)
        for profile in students:
            Notification.objects.create(
                user=profile.user,
                message=f"New Material: '{title}' has been added to {course.title}."
            )
        
        return Response({"message": "Assignment published successfully!"}, status=201)

    except Exception as e:
        print(f"--- Publish Error: {str(e)} ---")
        return Response({"error": str(e)}, status=500)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def teacher_select_course(request):
    if request.user.user_type != 2:
        return Response({"error": "Teachers only"}, status=403)
    
    course_id = request.data.get('course_id')
    try:
        course = Course.objects.get(id=course_id)
        request.user.teacher_profile.teaching_courses.add(course)
        return Response({"message": f"Added {course.title} to your teaching list"})
    except:
        return Response({"error": "Course not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_in_course(request, course_id):
    if request.user.user_type != 1:
        return Response({"error": "Unauthorized: Students only"}, status=403)
    try:
        course = Course.objects.get(pk=course_id)
        request.user.student_profile.enrolled_courses.add(course)
        teachers = TeacherProfile.objects.filter(teaching_courses=course)
        for profile in teachers:
            Notification.objects.create(
                user=profile.user,
                message=f"New Enrollment: {request.user.username} joined your course {course.title}."
            )
        return Response({"message": f"Successfully enrolled in {course.title}"})
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def post_feedback(request, course_id):
    if request.user.user_type != 1:
        return Response({"error": "Unauthorized: Students only"}, status=403)
        
    content = request.data.get('content')
    if not content:
        return Response({"error": "Feedback content is required"}, status=400)
        
    try:
        course = Course.objects.get(pk=course_id)
        Feedback.objects.create(
            course=course, 
            student=request.user,
            content=content
        )
        teachers = TeacherProfile.objects.filter(teaching_courses=course)
        for profile in teachers:
            Notification.objects.create(
                user=profile.user,
                message=f"New Feedback: {request.user.username} left a comment in {course.title}."
            )
        return Response({"message": "Feedback submitted successfully!"}, status=201)
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    if request.user.user_type != 2:
        return Response({"error": "Teachers only"}, status=403)
        
    query = request.query_params.get('q', '')
    users = User.objects.filter(
        models.Q(username__icontains=query) | models.Q(full_name__icontains=query)
    ).exclude(id=request.user.id)
    
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_course_students(request, course_id):
    try:
        course = Course.objects.get(pk=course_id)

        student_profiles = StudentProfile.objects.filter(enrolled_courses=course)
        students = [profile.user for profile in student_profiles]
        
        teacher_profiles = TeacherProfile.objects.filter(teaching_courses=course)
        teachers = [profile.user for profile in teacher_profiles]
        
        all_members = list(set(students + teachers))
        
        data = []
        for member in all_members:
            if member.id == request.user.id:
                continue
                
            data.append({
                "id": member.id,
                "username": member.username,
                "full_name": member.full_name,
                "user_type": member.user_type,
                "photo": member.photo.url if member.photo else None
            })
            
        return Response(data)

    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_course(request):
    if request.user.user_type != 2:
        return Response({"error": "Unauthorized: Teachers only"}, status=403)
    
    title = request.data.get('title')
    description = request.data.get('description')

    if not title:
        return Response({"error": "Course title is required"}, status=400)

    try:
        course = Course.objects.create(title=title, description=description)
        
        request.user.teacher_profile.teaching_courses.add(course)
        
        return Response({
            "message": "Course created and added to your teaching list!",
            "course_id": course.id
        }, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_courses(request):
    try:
        teacher_profile = request.user.teacher_profile
        courses = teacher_profile.teaching_courses.all()
        
        data = [{"id": c.id, "title": c.title, "description": c.description} for c in courses]
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_course(request, course_id):
    try:
        course = Course.objects.get(id=course_id)
        student_profile = request.user.student_profile
        student_profile.enrolled_courses.add(course)
        return Response({"message": f"Successfully enrolled in {course.title}"})
    except Course.DoesNotExist:
        return Response({"error": "Course not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_feedback(request, course_id):
    content = request.data.get('content')
    if not content:
        return Response({"error": "Feedback content is required"}, status=400)
        
    try:
        course = Course.objects.get(id=course_id)
        Feedback.objects.create(
            user=request.user,
            course=course,
            content=content
        )
        return Response({"message": "Feedback submitted"})
    except Exception as e:
        return Response({"error": str(e)}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    receiver_id = request.data.get('receiver_id')
    text = request.data.get('message')
    
    if not receiver_id or not text:
        return Response({"error": "Missing data"}, status=400)

    try:
        receiver = User.objects.get(id=receiver_id)
        msg = ChatMessage.objects.create(
            sender=request.user,
            receiver=receiver,
            message=text
        )
        return Response({"message": "Sent", "timestamp": msg.timestamp})
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_history(request, other_user_id):
    try:
        messages = ChatMessage.objects.filter(
            Q(sender=request.user, receiver_id=other_user_id) |
            Q(sender_id=other_user_id, receiver=request.user)
        ).order_by('timestamp')
        data = [{
            "sender": m.sender.username,
            "message": m.message,
            "timestamp": m.timestamp.strftime("%H:%M"),
            "is_me": m.sender == request.user
        } for m in messages]
        
        return Response(data)

    except Exception as e:
        print(f"Chat History Error: {str(e)}") 
        return Response({"error": "Server internal error"}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    try:
        notifications = request.user.notifications.all().order_by('-created_at')[:10]
        
        data = [{
            "id": n.id,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M")
        } for n in notifications]
        
        return Response(data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_profile(request, user_id):
    try:
        user = User.objects.get(pk=user_id)
        data = {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name or user.username,
            "user_type": user.user_type,
            "photo": user.photo.url if user.photo else None,
            "status": user.status or "No status set.",
            "courses": [],
            "deadlines": []
        }

        if user.user_type == 2:
            if hasattr(user, 'teacher_profile'):
                data["courses"] = [{"id": c.id, "title": c.title} for c in user.teacher_profile.teaching_courses.all()]
        else: 
            if hasattr(user, 'student_profile'):
                enrolled_courses = user.student_profile.enrolled_courses.all()
                data["courses"] = [{"id": c.id, "title": c.title} for c in enrolled_courses]
                
                from django.utils import timezone
                from .models import Assignment
                assignments = Assignment.objects.filter(
                    course__in=enrolled_courses,
                    deadline__gte=timezone.now()
                ).order_by('deadline')[:5]
                
                data["deadlines"] = [{
                    "id": a.id,
                    "title": a.title,
                    "deadline": a.deadline.isoformat(),
                    "material_url": a.material.url if a.material else None
                } for a in assignments]

        return Response(data)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not request.user.check_password(old_password):
        return Response({"error": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 6:
        return Response({"error": "New password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()

    update_session_auth_hash(request, request.user)

    return Response({"message": "Password changed successfully!"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile_settings(request):
    user = request.user
    full_name = request.data.get('full_name')
    photo = request.FILES.get('photo')

    if full_name:
        user.full_name = full_name
    
    if photo:
        user.photo = photo
    
    user.save()
    return Response({"message": "Profile updated successfully!", "full_name": user.full_name})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_student_from_course(request, course_id, student_id):
    if request.user.user_type != 2:
        return Response({"error": "Unauthorized: Only teachers can remove students."}, status=403)
    
    try:
        course = Course.objects.get(pk=course_id)
        if course not in request.user.teacher_profile.teaching_courses.all():
            return Response({"error": "You do not have permission to manage this course."}, status=403)
        
        student_to_remove = User.objects.get(pk=student_id)
        if student_to_remove.user_type != 1:
            return Response({"error": "Target user is not a student."}, status=400)
      
        student_profile = student_to_remove.student_profile
        if course in student_profile.enrolled_courses.all():
            student_profile.enrolled_courses.remove(course)

            Notification.objects.create(
                user=student_to_remove,
                message=f"Notice: You have been removed from the course '{course.title}' by the instructor."
            )
            
            return Response({"message": f"Student {student_to_remove.username} removed from {course.title}."})
        else:
            return Response({"error": "Student is not enrolled in this course."}, status=400)

    except Course.DoesNotExist:
        return Response({"error": "Course not found."}, status=404)
    except User.DoesNotExist:
        return Response({"error": "Student not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_course_feedback(request, course_id):
    if request.user.user_type != 2:
        return Response({"error": "Unauthorized: Only teachers can view feedback."}, status=403)
    
    try:
        feedbacks = Feedback.objects.filter(course_id=course_id).order_by('-created_at')
        
        data = [{
            "id": f.id,
            "student_name": f.student.full_name or f.student.username,
            "content": f.content,
            "date": f.created_at.strftime("%Y-%m-%d %H:%M")
        } for f in feedbacks]
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)