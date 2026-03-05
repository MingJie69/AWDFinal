from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import User, Course, StudentProfile, TeacherProfile, Assignment, Feedback

class ELearningSystemTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        
        self.teacher_user = User.objects.create_user(
            username='teacher1',
            password='password123',
            user_type=2,
            full_name='Test Teacher'
        )
        self.teacher_profile = TeacherProfile.objects.get(user=self.teacher_user)

        self.student_user = User.objects.create_user(
            username='student1',
            password='password123',
            user_type=1,
            full_name='Test Student'
        )
        self.student_profile = StudentProfile.objects.get(user=self.student_user)

        self.course = Course.objects.create(
            title='Python 101',
            description='Learn Python'
        )

    def test_login(self):
        url = '/api/auth/login/'
        data = {'username': 'student1', 'password': 'password123'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_teacher_create_course(self):
        self.client.force_authenticate(user=self.teacher_user)
        url = '/api/teacher/create-course/'
        data = {'title': 'New Science Course', 'description': 'Biology'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Course.objects.filter(title='New Science Course').exists())

    def test_student_enrollment(self):
        self.client.force_authenticate(user=self.student_user)
        url = f'/api/student/enroll/{self.course.id}/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(self.course, self.student_profile.enrolled_courses.all())

    def test_post_feedback(self):
        self.client.force_authenticate(user=self.student_user)
        url = f'/api/course/{self.course.id}/feedback/'
        data = {'content': 'Great course!'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Feedback.objects.count(), 1)

    def test_get_user_profile(self):
        self.client.force_authenticate(user=self.student_user)
        url = f'/api/user/{self.student_user.id}/profile/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'student1')

    def test_change_password(self):
        self.client.force_authenticate(user=self.student_user)
        url = '/api/auth/change-password/'
        data = {
            'old_password': 'password123',
            'new_password': 'newpassword456'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.student_user.refresh_from_db()
        self.assertTrue(self.student_user.check_password('newpassword456'))

    def test_unauthorized_course_creation(self):
        self.client.force_authenticate(user=self.student_user)
        url = '/api/teacher/create-course/'
        data = {'title': 'Illegal Course'}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_search_users_for_teacher(self):
        self.client.force_authenticate(user=self.teacher_user)
        url = '/api/teacher/search-users/'
        response = self.client.get(url, {'q': 'student1'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_update_profile_settings(self):
        self.client.force_authenticate(user=self.student_user)
        url = '/api/auth/update-profile/'
        data = {'full_name': 'Updated Name'}
        response = self.client.post(url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.student_user.refresh_from_db()
        self.assertEqual(self.student_user.full_name, 'Updated Name')