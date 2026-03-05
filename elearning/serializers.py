from rest_framework import serializers
from .models import User, Course, Assignment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'user_type', 'photo', 'status']

class AssignmentSerializer(serializers.ModelSerializer):
    material_url = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ['id', 'title', 'description', 'material', 'material_url', 'deadline', 'created_at']

    def get_material_url(self, obj):
        if obj.material:
            return obj.material.url
        return None

class CourseSerializer(serializers.ModelSerializer):
    assignments = AssignmentSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'assignments']