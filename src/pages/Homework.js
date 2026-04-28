import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { homeworkAPI, subjectsAPI, testsAPI } from '../api/api';
import './Homework.css';

const Homework = () => {
  const { user } = useAuth();
  const [homework, setHomework] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tests, setTests] = useState([]);
  const [testAnswers, setTestAnswers] = useState({});
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const subjectsRes = await subjectsAPI.getSubjects();
        setSubjects(subjectsRes.data);

        const studentId = user?.role === 'parent' && user?.child_ids?.length > 0 
          ? user.child_ids[0] 
          : user?.id;

        const [homeworkRes, testsRes] = await Promise.all([
          homeworkAPI.getStudentHomework(studentId),
          testsAPI.getStudentTests(studentId),
        ]);
        let filteredHomework = homeworkRes.data;
        let filteredTests = testsRes.data || [];

        if (selectedSubject) {
          filteredHomework = filteredHomework.filter(hw => hw.subject_id === selectedSubject);
          filteredTests = filteredTests.filter((t) => t.subject_id === selectedSubject);
        }

        // Сортируем по дате сдачи
        filteredHomework.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        filteredTests.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        
        setHomework(filteredHomework);
        setTests(filteredTests);
      } catch (error) {
        console.error('Ошибка загрузки домашних заданий:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, selectedSubject]);

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  const isDueSoon = (dueDate) => {
    const daysUntilDue = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 3 && daysUntilDue >= 0;
  };

  const handleSelectAnswer = (testId, questionIndex, optionIndex) => {
    setTestAnswers((prev) => ({
      ...prev,
      [testId]: {
        ...(prev[testId] || {}),
        [questionIndex]: optionIndex,
      },
    }));
  };

  const handleSubmitTest = async (testId) => {
    if (user?.role !== 'student') return;
    const answersMap = testAnswers[testId] || {};
    const answers = Object.entries(answersMap).map(([qIdx, oIdx]) => ({
      question_index: Number(qIdx),
      option_index: Number(oIdx),
    }));
    if (answers.length === 0) {
      window.alert('Выберите ответы перед отправкой теста');
      return;
    }
    try {
      const res = await testsAPI.submitTest(testId, { answers });
      const data = res.data;
      window.alert(
        `Тест отправлен.\nРезультат: ${data.correct_answers}/${data.total_questions}\nПроцент: ${data.score_percent}%\nОценка: ${data.grade_value}`,
      );
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось отправить тест'));
    }
  };

  if (loading) {
    return <div className="loading">Загрузка домашних заданий...</div>;
  }

  return (
    <div className="homework-page">
      <div className="page-header">
        <h1>Домашние задания</h1>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="subject-filter"
        >
          <option value="">Все предметы</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {homework.length === 0 ? (
        <div className="empty-state">Нет домашних заданий</div>
      ) : (
        <div className="homework-container">
          {homework.map((hw) => {
            const overdue = isOverdue(hw.due_date);
            const dueSoon = isDueSoon(hw.due_date);
            const subject = subjects.find(s => s.id === hw.subject_id);

            return (
              <div
                key={hw.id}
                className={`homework-card ${overdue ? 'overdue' : ''} ${dueSoon ? 'due-soon' : ''}`}
              >
                <div className="homework-header">
                  <div className="homework-title-section">
                    <h3>{hw.title}</h3>
                    <div className="homework-subject">
                      <span className="subject-label">Предмет:</span>
                      <strong>{subject?.name || hw.subject_id}</strong>
                    </div>
                  </div>
                  <span className={`due-date ${overdue ? 'overdue' : ''} ${dueSoon ? 'due-soon' : ''}`}>
                    {new Date(hw.due_date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="homework-description">
                  {hw.description}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="page-header" style={{ marginTop: '1rem' }}>
        <h1>Тесты</h1>
      </div>
      {tests.length === 0 ? (
        <div className="empty-state">Нет тестов</div>
      ) : (
        <div className="homework-container">
          {tests.map((test) => {
            const subject = subjects.find((s) => s.id === test.subject_id);
            return (
              <div key={test.id} className="homework-card">
                <div className="homework-header">
                  <div className="homework-title-section">
                    <h3>{test.title}</h3>
                    <div className="homework-subject">
                      <span className="subject-label">Предмет:</span>
                      <strong>{subject?.name || test.subject_id}</strong>
                    </div>
                  </div>
                  <span className="due-date">
                    До {new Date(test.due_date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                {test.description && <div className="homework-description">{test.description}</div>}
                {(test.questions || []).map((q, qIdx) => (
                  <div key={`${test.id}-q-${qIdx}`} className="homework-description">
                    <div><strong>{qIdx + 1}. {q.text}</strong></div>
                    {(q.options || []).map((opt, oIdx) => (
                      <label key={`${test.id}-q-${qIdx}-o-${oIdx}`} style={{ display: 'block', marginTop: '0.35rem' }}>
                        <input
                          type="radio"
                          name={`test-${test.id}-q-${qIdx}`}
                          checked={testAnswers[test.id]?.[qIdx] === oIdx}
                          onChange={() => handleSelectAnswer(test.id, qIdx, oIdx)}
                          disabled={user?.role !== 'student'}
                        />{' '}
                        {opt}
                      </label>
                    ))}
                  </div>
                ))}
                {user?.role === 'student' && (
                  <button className="subject-filter" onClick={() => handleSubmitTest(test.id)}>
                    Отправить тест
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Homework;
