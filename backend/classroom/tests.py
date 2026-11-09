from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from content.models import Atelier, Workshop
from .models import Classroom, Student, Submission

User = get_user_model()


class ClassroomStudentFlowTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user("teacher", password="safe-pass-123", role=User.Role.TEACHER)
        self.student = User.objects.create_user(
            "student", password="safe-pass-123", role=User.Role.STUDENT, first_name="Élise"
        )
        self.other_student = User.objects.create_user(
            "other", password="safe-pass-123", role=User.Role.STUDENT, first_name="Samir"
        )
        self.workshop = Workshop.objects.create(
            atelier=Atelier.ELOQUENCE, title="Studio d’éloquence"
        )
        self.workshop.teachers.add(self.teacher)
        self.classroom = Classroom.objects.create(teacher=self.teacher, name="3e B", join_code="AB12CD34")
        self.classroom.allowed_workshops.add(self.workshop)

    def test_student_joins_by_code_and_only_sees_own_class(self):
        self.client.force_authenticate(self.student)
        response = self.client.post("/api/classrooms/join/", {"code": "ab12cd34"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["name"], "3e B")
        profile = Student.objects.get(classroom=self.classroom, user=self.student)
        self.assertEqual(profile.name, "Élise")

        joined = self.client.get("/api/classrooms/")
        self.assertEqual([item["id"] for item in joined.data], [self.classroom.id])
        self.assertNotIn("students", joined.data[0])
        self.assertEqual(joined.data[0]["allowed_workshops"], [self.workshop.id])
        self.assertEqual(self.client.post("/api/classrooms/join/", {"code": "BADCODE1"}).status_code, 400)

    def test_student_cannot_view_another_class_or_modify_a_class(self):
        other_class = Classroom.objects.create(teacher=self.teacher, name="4e A")
        Student.objects.create(classroom=other_class, user=self.other_student, name="Samir")
        self.client.force_authenticate(self.student)
        self.assertEqual(self.client.get(f"/api/classrooms/{other_class.id}/").status_code, 404)
        self.assertEqual(self.client.patch(f"/api/classrooms/{self.classroom.id}/", {"name": "Autre"}).status_code, 403)

    def test_teacher_can_assign_only_their_workshops_to_class(self):
        self.client.force_authenticate(self.teacher)
        response = self.client.patch(
            f"/api/classrooms/{self.classroom.id}/",
            {"allowed_workshops": []},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["allowed_workshops"], [])

        another_teacher = User.objects.create_user("other-teacher", password="safe-pass-123", role=User.Role.TEACHER)
        foreign = Workshop.objects.create(atelier=Atelier.HISTOIRES, title="Histoires")
        foreign.teachers.add(another_teacher)
        response = self.client.patch(
            f"/api/classrooms/{self.classroom.id}/",
            {"allowed_workshops": [foreign.id]},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_student_can_enroll_and_submit_only_for_class_workshop(self):
        self.client.force_authenticate(self.student)
        self.client.post("/api/classrooms/join/", {"code": self.classroom.join_code})
        enroll = self.client.post(f"/api/content/workshops/{self.workshop.id}/enroll/")
        self.assertEqual(enroll.status_code, 201)
        response = self.client.post("/api/submissions/", {
            "classroom": self.classroom.id,
            "atelier": Atelier.ELOQUENCE,
            "text": "Je défends mon idée avec trois arguments.",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["student"], self.student.id)
        self.assertEqual(response.data["student_name"], "Élise")
        self.assertEqual(Submission.objects.count(), 1)

    def test_submission_history_is_private_to_student_and_visible_to_teacher(self):
        profile = Student.objects.create(classroom=self.classroom, user=self.student, name="Élise")
        submission = Submission.objects.create(
            classroom=self.classroom, student=self.student, student_name=profile.name,
            atelier=Atelier.ELOQUENCE, text="Mon texte",
        )
        self.client.force_authenticate(self.other_student)
        self.assertEqual(self.client.get("/api/submissions/").data, [])
        self.client.force_authenticate(self.teacher)
        response = self.client.get(f"/api/submissions/?classroom={self.classroom.id}")
        self.assertEqual([item["id"] for item in response.data], [submission.id])
