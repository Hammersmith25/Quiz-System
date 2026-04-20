from rest_framework import status
from rest_framework.test import APITestCase

from .models import Attempt, Grade, Quiz, User


class AuthTests(APITestCase):
    def test_register_and_login(self):
        register_response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'teacher1',
                'email': 'teacher@example.com',
                'password': 'StrongPass123',
                'role': 'teacher',
            },
            format='json',
        )
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)

        login_response = self.client.post(
            '/api/auth/login/',
            {'username': 'teacher1', 'password': 'StrongPass123'},
            format='json',
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_response.data)
        self.assertIn('refresh', login_response.data)
        self.assertEqual(login_response.data['user']['role'], 'teacher')

    def test_logout_blacklists_refresh_token(self):
        User.objects.create_user(
            username='teacher2',
            email='teacher2@example.com',
            password='StrongPass123',
            role='teacher',
        )
        login_response = self.client.post(
            '/api/auth/login/',
            {'username': 'teacher2', 'password': 'StrongPass123'},
            format='json',
        )
        logout_response = self.client.post(
            '/api/auth/logout/',
            {'refresh': login_response.data['refresh']},
            format='json',
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

        refresh_response = self.client.post(
            '/api/auth/refresh/',
            {'refresh': login_response.data['refresh']},
            format='json',
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)


class QuizFlowTests(APITestCase):
    def setUp(self):
        self.teacher = User.objects.create_user(
            username='teacher',
            email='teacher@example.com',
            password='StrongPass123',
            role='teacher',
        )
        self.student = User.objects.create_user(
            username='student',
            email='student@example.com',
            password='StrongPass123',
            role='student',
        )

    def authenticate(self, user):
        response = self.client.post(
            '/api/auth/login/',
            {'username': user.username, 'password': 'StrongPass123'},
            format='json',
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_teacher_can_create_publish_and_view_results(self):
        self.authenticate(self.teacher)
        create_response = self.client.post(
            '/api/quizzes/',
            {
                'title': 'Python Basics',
                'description': 'Intro quiz',
                'duration': 20,
                'questions': [
                    {
                        'text': 'Python is interpreted?',
                        'question_type': 'true_false',
                        'points': 2,
                        'answer_options': [
                            {'text': 'True', 'is_correct': True},
                            {'text': 'False', 'is_correct': False},
                        ],
                    },
                    {
                        'text': 'Main Django package?',
                        'question_type': 'short_answer',
                        'points': 3,
                        'correct_text_answer': 'django',
                    },
                ],
            },
            format='json',
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        quiz_id = create_response.data['id']

        publish_response = self.client.post(f'/api/quizzes/{quiz_id}/publish/')
        self.assertEqual(publish_response.status_code, status.HTTP_200_OK)
        self.assertTrue(Quiz.objects.get(id=quiz_id).is_published)

        self.client.credentials()
        self.authenticate(self.student)
        quiz_detail = self.client.get(f'/api/quizzes/{quiz_id}/')
        self.assertEqual(quiz_detail.status_code, status.HTTP_200_OK)
        self.assertNotIn('is_correct', str(quiz_detail.data))
        self.assertNotIn('correct_text_answer', str(quiz_detail.data))

        questions = quiz_detail.data['questions']
        true_false_question = next(question for question in questions if question['question_type'] == 'true_false')
        short_answer_question = next(question for question in questions if question['question_type'] == 'short_answer')
        self.client.credentials()
        self.authenticate(self.teacher)
        teacher_quiz_detail = self.client.get(f'/api/quizzes/{quiz_id}/')
        correct_option = next(
            option
            for question in teacher_quiz_detail.data['questions']
            if question['question_type'] == 'true_false'
            for option in question['answer_options']
            if option['is_correct']
        )

        self.client.credentials()
        self.authenticate(self.student)
        start_response = self.client.post(
            '/api/attempt/start/',
            {'quiz_id': quiz_id},
            format='json',
        )
        self.assertEqual(start_response.status_code, status.HTTP_201_CREATED)
        attempt_id = start_response.data['attempt']['id']
        self.assertEqual(start_response.data['attempt']['status'], 'started')

        submit_response = self.client.post(
            '/api/attempt/submit/',
            {
                'attempt_id': attempt_id,
                'answers': [
                    {
                        'question': true_false_question['id'],
                        'selected_option': correct_option['id'],
                    },
                    {
                        'question': short_answer_question['id'],
                        'text_answer': 'Django',
                    },
                ]
            },
            format='json',
        )
        self.assertEqual(submit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(submit_response.data['score'], 5)
        self.assertEqual(submit_response.data['grade']['letter_grade'], 'A')
        self.assertEqual(submit_response.data['status'], 'graded')
        self.assertEqual(Attempt.objects.count(), 1)
        self.assertEqual(Grade.objects.count(), 1)

        history_response = self.client.get('/api/history/')
        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_response.data), 1)
        self.assertEqual(history_response.data[0]['letter_grade'], 'A')

        self.client.credentials()
        self.authenticate(self.teacher)
        results_response = self.client.get(f'/api/quizzes/{quiz_id}/results/')
        self.assertEqual(results_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(results_response.data), 1)
        self.assertEqual(results_response.data[0]['student_username'], 'student')
        students_response = self.client.get('/api/students/')
        self.assertEqual(students_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(students_response.data), 1)
        self.assertEqual(students_response.data[0]['username'], 'student')

    def test_student_cannot_create_quiz(self):
        self.authenticate(self.student)
        response = self.client.post(
            '/api/quizzes/',
            {'title': 'Forbidden', 'description': '', 'questions': []},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_true_false_question_is_rejected(self):
        self.authenticate(self.teacher)
        response = self.client.post(
            '/api/quizzes/',
            {
                'title': 'Broken quiz',
                'description': 'Invalid true/false',
                'questions': [
                    {
                        'text': 'This should fail',
                        'question_type': 'true_false',
                        'points': 1,
                        'answer_options': [
                            {'text': 'Yes', 'is_correct': True},
                            {'text': 'No', 'is_correct': False},
                        ],
                    }
                ],
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('True/false options must be', str(response.data))

    def test_submit_rejects_unknown_question_ids(self):
        self.authenticate(self.teacher)
        create_response = self.client.post(
            '/api/quizzes/',
            {
                'title': 'Python Basics',
                'description': 'Intro quiz',
                'duration': 15,
                'questions': [
                    {
                        'text': 'Python is interpreted?',
                        'question_type': 'true_false',
                        'points': 2,
                        'answer_options': [
                            {'text': 'True', 'is_correct': True},
                            {'text': 'False', 'is_correct': False},
                        ],
                    }
                ],
            },
            format='json',
        )
        quiz_id = create_response.data['id']
        self.client.post(f'/api/quizzes/{quiz_id}/publish/')

        self.client.credentials()
        self.authenticate(self.student)
        start_response = self.client.post(
            '/api/attempt/start/',
            {'quiz_id': quiz_id},
            format='json',
        )
        submit_response = self.client.post(
            '/api/attempt/submit/',
            {
                'attempt_id': start_response.data['attempt']['id'],
                'answers': [
                    {
                        'question': 99999,
                        'selected_option': 1,
                    }
                ]
            },
            format='json',
        )
        self.assertEqual(submit_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('do not belong', str(submit_response.data))
