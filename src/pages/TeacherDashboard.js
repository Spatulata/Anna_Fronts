import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { classesAPI, subjectsAPI, gradesAPI, scheduleAPI, usersAPI, homeworkAPI, testsAPI } from '../api/api';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('schedule');
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [classGrades, setClassGrades] = useState([]);
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGrade, setNewGrade] = useState({ studentId: '', value: 5, date: new Date().toISOString().split('T')[0], comment: '' });
  const [pendingGradeValues, setPendingGradeValues] = useState({});
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [gradeModalForm, setGradeModalForm] = useState({ value: 5, comment: '' });
  const [pendingGradeStudentId, setPendingGradeStudentId] = useState(null);
  const [homeworkItems, setHomeworkItems] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedHomeworkClass, setSelectedHomeworkClass] = useState('');
  const [selectedHomeworkSubject, setSelectedHomeworkSubject] = useState('');
  const [homeworkForm, setHomeworkForm] = useState({
    class_id: '',
    subject_id: '',
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
  });
  const [testForm, setTestForm] = useState({
    class_id: '',
    subject_id: '',
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    questions: [
      {
        text: '',
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
        ],
      },
    ],
  });
  const gradeReasonOptions = [
    'Домашнее задание',
    'Классная работа',
    'Самостоятельная работа',
    'Контрольная работа',
    'Проверочная работа',
    'Ответ у доски',
    'Практическая работа',
    'Лабораторная работа',
    'Тест',
    'Проект',
  ];

  // Загрузка классов и предметов
  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesRes, subjectsRes] = await Promise.all([
          classesAPI.getClasses(),
          subjectsAPI.getSubjects()
        ]);
        const nextClasses = classesRes.data || [];
        const nextSubjects = subjectsRes.data || [];
        setClasses(nextClasses);
        setSubjects(nextSubjects);
        if (nextClasses.length > 0 && nextSubjects.length > 0) {
          const defaultClassId = nextClasses[0].id;
          const defaultSubjectId = nextSubjects[0].id;
          setSelectedHomeworkClass(defaultClassId);
          setSelectedHomeworkSubject(defaultSubjectId);
          setHomeworkForm((prev) => ({
            ...prev,
            class_id: defaultClassId,
            subject_id: defaultSubjectId,
          }));
          setTestForm((prev) => ({
            ...prev,
            class_id: defaultClassId,
            subject_id: defaultSubjectId,
          }));
        }

        // Загрузка расписания учителя
        try {
          const scheduleRes = await scheduleAPI.getTeacherSchedule(user.id);
          setTeacherSchedule(scheduleRes.data || []);
        } catch (e) {
          console.warn('Не удалось загрузить расписание:', e);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) loadData();
  }, [user]);

  // Загрузка учеников класса
  useEffect(() => {
    if (!selectedClass) return;
    const loadStudents = async () => {
      try {
        const res = await usersAPI.getClassStudents(selectedClass);
        setStudents(res.data || []);
      } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
        setStudents([]);
      }
    };
    loadStudents();
  }, [selectedClass]);

  // Загрузка оценок класса по предмету
  useEffect(() => {
    if (!selectedClass || !selectedSubject) return;
    const loadGrades = async () => {
      try {
        const res = await gradesAPI.getClassGrades(selectedClass, selectedSubject);
        setClassGrades(res.data || []);
      } catch (error) {
        console.error('Ошибка загрузки оценок:', error);
        setClassGrades([]);
      }
    };
    loadGrades();
  }, [selectedClass, selectedSubject]);

  useEffect(() => {
    const loadHomeworkAndTests = async () => {
      try {
        const [hwRes, testsRes] = await Promise.all([
          homeworkAPI.getMyHomework({
            ...(selectedHomeworkClass ? { class_id: selectedHomeworkClass } : {}),
            ...(selectedHomeworkSubject ? { subject_id: selectedHomeworkSubject } : {}),
          }),
          testsAPI.getMyTests({
            ...(selectedHomeworkClass ? { class_id: selectedHomeworkClass } : {}),
            ...(selectedHomeworkSubject ? { subject_id: selectedHomeworkSubject } : {}),
          }),
        ]);
        setHomeworkItems(hwRes.data || []);
        setTests(testsRes.data || []);
      } catch (error) {
        console.error('Ошибка загрузки ДЗ/тестов:', error);
        setHomeworkItems([]);
        setTests([]);
      }
    };
    loadHomeworkAndTests();
  }, [selectedHomeworkClass, selectedHomeworkSubject, user.id]);

  // Добавить оценку
  const handleAddGrade = async () => {
    if (!newGrade.studentId || !selectedSubject) {
      window.alert('Выберите ученика и предмет');
      return;
    }
    try {
      await gradesAPI.createGrade({
        student_id: newGrade.studentId,
        subject_id: selectedSubject,
        value: parseInt(newGrade.value),
        date: newGrade.date,
        comment: newGrade.comment || undefined,
        teacher_id: user.id
      });
      setNewGrade({ studentId: '', value: 5, date: new Date().toISOString().split('T')[0], comment: '' });
      // Перезагрузить оценки
      const res = await gradesAPI.getClassGrades(selectedClass, selectedSubject);
      setClassGrades(res.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось добавить оценку'));
    }
  };

  // Обновить оценку
  const handleUpdateGrade = async (gradeId, value) => {
    try {
      await gradesAPI.updateGrade(gradeId, { value });
      const res = await gradesAPI.getClassGrades(selectedClass, selectedSubject);
      setClassGrades(res.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось обновить'));
    }
  };

  // Удалить оценку
  const handleDeleteGrade = async (gradeId) => {
    if (!window.confirm('Удалить эту оценку?')) return;
    try {
      await gradesAPI.deleteGrade(gradeId);
      const res = await gradesAPI.getClassGrades(selectedClass, selectedSubject);
      setClassGrades(res.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось удалить'));
    }
  };

  // Получить расписание по дням недели
  const getScheduleByDay = () => {
    const days = {};
    teacherSchedule.forEach(item => {
      if (!days[item.day_of_week]) days[item.day_of_week] = [];
      days[item.day_of_week].push(item);
    });
    return days;
  };

  const scheduleByDay = getScheduleByDay();
  const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || id;
  const getClassName = (id) => {
    const cls = classes.find(c => c.id === id);
    return cls ? `${cls.grade}${cls.letter}` : id;
  };
  const getStudentName = (id) => students.find(s => s.id === id)?.full_name || id;

  if (loading) return <div className="teacher-loading">Загрузка данных учителя...</div>;

  // Классы, где учитель преподаёт (или все классы если нет привязки)
  const myClasses = classes.filter(c => c.teachers?.includes(user.id));
  const availableClasses = myClasses.length > 0 ? myClasses : classes;
  const mySubjectIds = user?.subject_ids || [];
  const availableSubjects = mySubjectIds.length > 0
    ? subjects.filter(s => mySubjectIds.includes(s.id))
    : subjects;

  const sortedClassGrades = [...classGrades].sort((a, b) => new Date(b.date) - new Date(a.date));
  const journalRows = students
    .map((student) => {
      const studentGrades = sortedClassGrades.filter((grade) => grade.student_id === student.id);
      const total = studentGrades.reduce((sum, grade) => sum + grade.value, 0);
      const average = studentGrades.length > 0 ? (total / studentGrades.length).toFixed(2) : null;
      return {
        studentId: student.id,
        studentName: student.full_name,
        grades: studentGrades,
        average,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ru'));

  const openGradeModal = (grade) => {
    setSelectedGrade(grade);
    setGradeModalForm({
      value: grade.value,
      comment: grade.comment || '',
    });
  };

  const handleApplyGradeForStudent = async (studentId) => {
    const value = parseInt(pendingGradeValues[studentId], 10);
    if (!value || value < 1 || value > 5) {
      window.alert('Введите оценку от 1 до 5');
      return;
    }
    setPendingGradeStudentId(studentId);
    setGradeModalForm({ value, comment: '' });
  };

  const handleConfirmCreateGrade = async () => {
    if (!pendingGradeStudentId) return;
    const value = parseInt(gradeModalForm.value, 10);
    if (!value || value < 1 || value > 5) {
      window.alert('Введите оценку от 1 до 5');
      return;
    }
    if (!gradeModalForm.comment) {
      window.alert('Выберите причину выставления оценки');
      return;
    }
    try {
      await gradesAPI.createGrade({
        student_id: pendingGradeStudentId,
        subject_id: selectedSubject,
        value,
        date: new Date().toISOString().split('T')[0],
        teacher_id: user.id,
        comment: gradeModalForm.comment,
      });
      setPendingGradeValues((prev) => ({ ...prev, [pendingGradeStudentId]: '' }));
      setPendingGradeStudentId(null);
      const res = await gradesAPI.getClassGrades(selectedClass, selectedSubject);
      setClassGrades(res.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось выставить оценку'));
    }
  };

  const handleSaveGradeModal = async () => {
    if (!selectedGrade) return;
    const nextValue = parseInt(gradeModalForm.value, 10);
    if (!nextValue || nextValue < 1 || nextValue > 5) {
      window.alert('Оценка должна быть от 1 до 5');
      return;
    }
    if (!gradeModalForm.comment) {
      window.alert('Выберите причину выставления оценки');
      return;
    }
    try {
      await gradesAPI.updateGrade(selectedGrade.id, {
        value: nextValue,
        comment: gradeModalForm.comment,
      });
      setSelectedGrade(null);
      const res = await gradesAPI.getClassGrades(selectedClass, selectedSubject);
      setClassGrades(res.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось обновить оценку'));
    }
  };

  const getNearestLessonDate = (classId, subjectId) => {
    if (!classId || !subjectId) return new Date().toISOString().split('T')[0];
    const now = new Date();
    const matches = teacherSchedule.filter((item) => item.class_id === classId && item.subject_id === subjectId);
    if (matches.length === 0) return new Date().toISOString().split('T')[0];

    let bestDate = null;
    for (let shift = 0; shift < 14; shift += 1) {
      const candidate = new Date(now);
      candidate.setDate(now.getDate() + shift);
      const jsDay = candidate.getDay(); // 0 вс ... 6 сб
      const dayOfWeek = jsDay === 0 ? 6 : jsDay - 1;
      if (matches.some((item) => item.day_of_week === dayOfWeek)) {
        bestDate = candidate;
        break;
      }
    }
    return (bestDate || now).toISOString().split('T')[0];
  };

  const handleCreateHomework = async () => {
    if (!homeworkForm.class_id || !homeworkForm.subject_id || !homeworkForm.title || !homeworkForm.description) {
      window.alert('Заполните класс, предмет, тему и описание ДЗ');
      return;
    }
    try {
      await homeworkAPI.createHomework({
        class_id: homeworkForm.class_id,
        subject_id: homeworkForm.subject_id,
        title: homeworkForm.title,
        description: homeworkForm.description,
        due_date: homeworkForm.due_date,
        teacher_id: user.id,
      });
      setHomeworkForm((prev) => ({ ...prev, title: '', description: '' }));
      setSelectedHomeworkClass(homeworkForm.class_id);
      setSelectedHomeworkSubject(homeworkForm.subject_id);
      const hwRes = await homeworkAPI.getMyHomework({
        ...(homeworkForm.class_id ? { class_id: homeworkForm.class_id } : {}),
        ...(homeworkForm.subject_id ? { subject_id: homeworkForm.subject_id } : {}),
      });
      setHomeworkItems(hwRes.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось создать ДЗ'));
    }
  };

  const handleAddQuestion = () => {
    setTestForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: '',
          options: [
            { text: '', is_correct: true },
            { text: '', is_correct: false },
          ],
        },
      ],
    }));
  };

  const handleDeleteQuestion = (qIdx) => {
    setTestForm((prev) => {
      if (prev.questions.length <= 1) return prev;
      return {
        ...prev,
        questions: prev.questions.filter((_, idx) => idx !== qIdx),
      };
    });
  };

  const handleAddOption = (qIdx) => {
    setTestForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => {
        if (idx !== qIdx) return q;
        return {
          ...q,
          options: [...q.options, { text: '', is_correct: false }],
        };
      }),
    }));
  };

  const handleTestQuestionChange = (qIdx, value) => {
    setTestForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => (idx === qIdx ? { ...q, text: value } : q)),
    }));
  };

  const handleTestOptionChange = (qIdx, oIdx, key, value) => {
    setTestForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => {
        if (idx !== qIdx) return q;
        const options = q.options.map((o, oi) => {
          if (oi !== oIdx) return o;
          return key === 'is_correct' ? { ...o, is_correct: true } : { ...o, text: value };
        });
        if (key === 'is_correct') {
          return {
            ...q,
            options: options.map((o, oi) => ({ ...o, is_correct: oi === oIdx })),
          };
        }
        return { ...q, options };
      }),
    }));
  };

  const handleCreateTest = async () => {
    if (!testForm.class_id || !testForm.subject_id || !testForm.title || testForm.questions.length === 0) {
      window.alert('Заполните класс, предмет, название и вопросы теста');
      return;
    }
    const hasInvalid = testForm.questions.some(
      (q) => !q.text || q.options.length < 2 || q.options.some((o) => !o.text) || q.options.filter((o) => o.is_correct).length !== 1,
    );
    if (hasInvalid) {
      window.alert('Проверьте вопросы: текст, варианты и один правильный ответ на вопрос');
      return;
    }

    try {
      await testsAPI.createTest({
        class_id: testForm.class_id,
        subject_id: testForm.subject_id,
        title: testForm.title,
        description: testForm.description || undefined,
        due_date: testForm.due_date,
        questions: testForm.questions,
      });
      setSelectedHomeworkClass(testForm.class_id);
      setSelectedHomeworkSubject(testForm.subject_id);
      setTestForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        questions: [
          {
            text: '',
            options: [
              { text: '', is_correct: true },
              { text: '', is_correct: false },
            ],
          },
        ],
      }));
      const testsRes = await testsAPI.getMyTests({
        ...(testForm.class_id ? { class_id: testForm.class_id } : {}),
        ...(testForm.subject_id ? { subject_id: testForm.subject_id } : {}),
      });
      setTests(testsRes.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось создать тест'));
    }
  };

  const handleDeleteHomework = async (id) => {
    if (!window.confirm('Удалить это домашнее задание?')) return;
    try {
      await homeworkAPI.deleteHomework(id);
      setHomeworkItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось удалить домашнее задание'));
    }
  };

  const handleDeleteTest = async (id) => {
    if (!window.confirm('Удалить этот тест?')) return;
    try {
      await testsAPI.deleteTest(id);
      setTests((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось удалить тест'));
    }
  };

  return (
    <div className="teacher-dashboard">
      <div className="teacher-header">
        <h1>Кабинет учителя</h1>
        <p className="teacher-subtitle">{user?.full_name}</p>
      </div>

      {/* Табы */}
      <div className="teacher-tabs">
        <button
          className={`teacher-tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          📅 Моё расписание
        </button>
        <button
          className={`teacher-tab ${activeTab === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveTab('grades')}
        >
          📝 Журнал оценок
        </button>
        <button
          className={`teacher-tab ${activeTab === 'homework' ? 'active' : ''}`}
          onClick={() => setActiveTab('homework')}
        >
          📚 Домашние задания
        </button>
      </div>

      {/* Расписание */}
      {activeTab === 'schedule' && (
        <div className="teacher-schedule">
          {teacherSchedule.length === 0 ? (
            <div className="empty-state">Расписание не заполнено</div>
          ) : (
            <div className="schedule-grid">
              {[0, 1, 2, 3, 4].map(day => (
                <div key={day} className="schedule-day-card">
                  <div className="day-header">{dayNames[day]}</div>
                  {scheduleByDay[day]?.sort((a, b) => a.lesson_number - b.lesson_number).map(item => (
                    <div key={item.id} className="lesson-card">
                      <div className="lesson-number">Урок {item.lesson_number}</div>
                      <div className="lesson-subject">{getSubjectName(item.subject_id)}</div>
                      <div className="lesson-class">{getClassName(item.class_id)}</div>
                      {item.room && <div className="lesson-room">Каб. {item.room}</div>}
                    </div>
                  ))}
                  {!scheduleByDay[day] && <div className="no-lessons">Нет уроков</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Журнал оценок */}
      {activeTab === 'grades' && (
        <div className="teacher-grades">
          <div className="grades-filters">
            <div className="filter-group">
              <label>Класс</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Выберите класс</option>
                {availableClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Предмет</label>
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="">Выберите предмет</option>
                {availableSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedClass && selectedSubject && (
            <>
              {/* Форма добавления оценки */}
              <div className="add-grade-form">
                <h3>Добавить оценку</h3>
                <div className="form-row">
                  <select
                    value={newGrade.studentId}
                    onChange={(e) => setNewGrade(prev => ({ ...prev, studentId: e.target.value }))}
                  >
                    <option value="">Выберите ученика</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={newGrade.value}
                    onChange={(e) => setNewGrade(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Оценка"
                  />
                  <input
                    type="date"
                    value={newGrade.date}
                    onChange={(e) => setNewGrade(prev => ({ ...prev, date: e.target.value }))}
                  />
                  <input
                    type="text"
                    placeholder="Комментарий (необязательно)"
                    value={newGrade.comment}
                    onChange={(e) => setNewGrade(prev => ({ ...prev, comment: e.target.value }))}
                  />
                  <button className="btn-add-grade" onClick={handleAddGrade}>Добавить</button>
                </div>
              </div>

              {/* Таблица оценок */}
              <div className="grades-table-wrapper">
                {journalRows.length === 0 ? (
                  <div className="empty-state">В выбранном классе пока нет учеников</div>
                ) : (
                  <>
                    <div className="journal-header">
                      <h3>
                        Журнал: {getClassName(selectedClass)} - {getSubjectName(selectedSubject)}
                      </h3>
                      <span className="journal-meta">
                        Учеников: {journalRows.length} | Оценок: {classGrades.length}
                      </span>
                    </div>
                  <table className="teacher-grades-table">
                    <thead>
                      <tr>
                        <th>Ученик</th>
                        <th>Последние оценки</th>
                        <th>Средний балл</th>
                        <th>Последняя дата</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {journalRows.map((row) => (
                        <tr key={row.studentId}>
                          <td>{row.studentName}</td>
                          <td>
                            {row.grades.length === 0 ? (
                              <span className="no-grades-inline">Нет оценок</span>
                            ) : (
                              <div className="grade-badges-row">
                                {row.grades.slice(0, 8).map((grade) => (
                                  <button
                                    key={grade.id}
                                    type="button"
                                    className={`grade-badge grade-badge-btn grade-${grade.value}`}
                                    title={grade.comment || 'Без комментария'}
                                    onClick={() => openGradeModal(grade)}
                                  >
                                    {grade.value}
                                  </button>
                                ))}
                                {row.grades.length > 8 && (
                                  <span className="more-grades-badge">+{row.grades.length - 8}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td>{row.average || '—'}</td>
                          <td>{row.grades[0] ? new Date(row.grades[0].date).toLocaleDateString('ru-RU') : '—'}</td>
                          <td>
                            {row.grades[0] ? (
                              <div className="row-actions">
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  className="inline-grade-input"
                                  value={pendingGradeValues[row.studentId] ?? ''}
                                  onChange={(e) => setPendingGradeValues((prev) => ({ ...prev, [row.studentId]: e.target.value }))}
                                  placeholder="1-5"
                                  title="Новая оценка"
                                />
                                <button
                                  className="btn-apply-grade"
                                  onClick={() => handleApplyGradeForStudent(row.studentId)}
                                  title="Применить"
                                >
                                  ✓
                                </button>
                                <button className="btn-delete-grade" onClick={() => handleDeleteGrade(row.grades[0].id)} title="Удалить последнюю оценку">🗑️</button>
                              </div>
                            ) : (
                              <div className="row-actions">
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  className="inline-grade-input"
                                  value={pendingGradeValues[row.studentId] ?? ''}
                                  onChange={(e) => setPendingGradeValues((prev) => ({ ...prev, [row.studentId]: e.target.value }))}
                                  placeholder="1-5"
                                  title="Новая оценка"
                                />
                                <button
                                  className="btn-apply-grade"
                                  onClick={() => handleApplyGradeForStudent(row.studentId)}
                                  title="Применить"
                                >
                                  ✓
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {selectedGrade && (
        <div className="modal-overlay" onClick={() => setSelectedGrade(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Оценка ученика</h2>
              <button className="modal-close" onClick={() => setSelectedGrade(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grade-detail-row"><strong>Ученик:</strong> {getStudentName(selectedGrade.student_id)}</div>
              <div className="grade-detail-row"><strong>Дата:</strong> {new Date(selectedGrade.date).toLocaleDateString('ru-RU')}</div>
              <div className="form-group">
                <label>Оценка</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={gradeModalForm.value}
                  onChange={(e) => setGradeModalForm((prev) => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Причина / комментарий</label>
                <select
                  value={gradeModalForm.comment}
                  onChange={(e) => setGradeModalForm((prev) => ({ ...prev, comment: e.target.value }))}
                >
                  <option value="">Выберите причину</option>
                  {gradeReasonOptions.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setSelectedGrade(null)}>Отмена</button>
              <button className="btn-delete-grade" onClick={() => handleDeleteGrade(selectedGrade.id)}>Удалить</button>
              <button className="btn-save" onClick={handleSaveGradeModal}>Подтвердить</button>
            </div>
          </div>
        </div>
      )}

      {pendingGradeStudentId && (
        <div className="modal-overlay" onClick={() => setPendingGradeStudentId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Подтверждение оценки</h2>
              <button className="modal-close" onClick={() => setPendingGradeStudentId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grade-detail-row"><strong>Ученик:</strong> {getStudentName(pendingGradeStudentId)}</div>
              <div className="form-group">
                <label>Оценка</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={gradeModalForm.value}
                  onChange={(e) => setGradeModalForm((prev) => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Причина выставления оценки</label>
                <select
                  value={gradeModalForm.comment}
                  onChange={(e) => setGradeModalForm((prev) => ({ ...prev, comment: e.target.value }))}
                >
                  <option value="">Выберите причину</option>
                  {gradeReasonOptions.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setPendingGradeStudentId(null)}>Отмена</button>
              <button className="btn-save" onClick={handleConfirmCreateGrade}>Подтвердить</button>
            </div>
          </div>
        </div>
      )}

      {/* Домашние задания и тесты */}
      {activeTab === 'homework' && (
        <div className="teacher-homework">
          <div className="teacher-grades" style={{ width: '100%' }}>
            <div className="grades-filters">
              <div className="filter-group">
                <label>Класс</label>
                <select
                  value={homeworkForm.class_id}
                  onChange={(e) => {
                    const classId = e.target.value;
                    const dueDate = getNearestLessonDate(classId, homeworkForm.subject_id);
                    setSelectedHomeworkClass(classId);
                    setHomeworkForm((prev) => ({ ...prev, class_id: classId, due_date: dueDate }));
                    setTestForm((prev) => ({ ...prev, class_id: classId, due_date: getNearestLessonDate(classId, prev.subject_id) }));
                  }}
                >
                  <option value="">Выберите класс</option>
                  {availableClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Предмет</label>
                <select
                  value={homeworkForm.subject_id}
                  onChange={(e) => {
                    const subjectId = e.target.value;
                    const dueDate = getNearestLessonDate(homeworkForm.class_id, subjectId);
                    setSelectedHomeworkSubject(subjectId);
                    setHomeworkForm((prev) => ({ ...prev, subject_id: subjectId, due_date: dueDate }));
                    setTestForm((prev) => ({ ...prev, subject_id: subjectId, due_date: getNearestLessonDate(prev.class_id, subjectId) }));
                  }}
                >
                  <option value="">Выберите предмет</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="add-grade-form">
              <h3>Выдать домашнее задание на ближайший урок</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Тема / заголовок"
                  value={homeworkForm.title}
                  onChange={(e) => setHomeworkForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                <input
                  type="date"
                  value={homeworkForm.due_date}
                  onChange={(e) => setHomeworkForm((prev) => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div className="form-row" style={{ marginTop: '0.6rem' }}>
                <input
                  type="text"
                  placeholder="Описание задания"
                  value={homeworkForm.description}
                  onChange={(e) => setHomeworkForm((prev) => ({ ...prev, description: e.target.value }))}
                />
                <button className="btn-add-grade" onClick={handleCreateHomework}>Выдать ДЗ</button>
              </div>
            </div>

            <div className="add-grade-form">
              <h3>Создать тест с автопроверкой и автооценкой</h3>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Название теста"
                  value={testForm.title}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                <input
                  type="date"
                  value={testForm.due_date}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
              <div className="form-row" style={{ marginTop: '0.6rem' }}>
                <input
                  type="text"
                  placeholder="Описание теста (необязательно)"
                  value={testForm.description}
                  onChange={(e) => setTestForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              {testForm.questions.map((question, qIdx) => (
                <div key={`q-${qIdx}`} className="form-row" style={{ marginTop: '0.6rem' }}>
                  <input
                    type="text"
                    placeholder={`Вопрос ${qIdx + 1}`}
                    value={question.text}
                    onChange={(e) => handleTestQuestionChange(qIdx, e.target.value)}
                  />
                  {question.options.map((option, oIdx) => (
                    <div key={`q-${qIdx}-o-${oIdx}`} style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <input
                        type="radio"
                        checked={option.is_correct}
                        onChange={() => handleTestOptionChange(qIdx, oIdx, 'is_correct', true)}
                        title="Правильный ответ"
                      />
                      <input
                        type="text"
                        placeholder={`Вариант ${oIdx + 1}`}
                        value={option.text}
                        onChange={(e) => handleTestOptionChange(qIdx, oIdx, 'text', e.target.value)}
                      />
                    </div>
                  ))}
                  <button className="btn-delete-grade" type="button" onClick={() => handleDeleteQuestion(qIdx)}>
                    Удалить вопрос
                  </button>
                  <button className="btn-add-grade" type="button" onClick={() => handleAddOption(qIdx)}>
                    + Вариант
                  </button>
                </div>
              ))}
              <div className="form-row" style={{ marginTop: '0.6rem' }}>
                <button className="btn-add-grade" type="button" onClick={handleAddQuestion}>+ Вопрос</button>
                <button className="btn-add-grade" type="button" onClick={handleCreateTest}>Создать тест</button>
              </div>
            </div>

            <div className="grades-table-wrapper">
              <div className="journal-header">
                <h3>Мои ДЗ и тесты</h3>
                <span className="journal-meta">ДЗ: {homeworkItems.length} | Тесты: {tests.length}</span>
              </div>
              <table className="teacher-grades-table">
                <thead>
                  <tr>
                    <th>Тип</th>
                    <th>Название</th>
                    <th>Класс</th>
                    <th>Предмет</th>
                    <th>Срок</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {homeworkItems.map((item) => (
                    <tr key={`hw-${item.id}`}>
                      <td>ДЗ</td>
                      <td>{item.title}</td>
                      <td>{getClassName(item.class_id)}</td>
                      <td>{getSubjectName(item.subject_id)}</td>
                      <td>{new Date(item.due_date).toLocaleDateString('ru-RU')}</td>
                      <td><button className="btn-delete-grade" onClick={() => handleDeleteHomework(item.id)}>Удалить</button></td>
                    </tr>
                  ))}
                  {tests.map((item) => (
                    <tr key={`test-${item.id}`}>
                      <td>Тест</td>
                      <td>{item.title}</td>
                      <td>{getClassName(item.class_id)}</td>
                      <td>{getSubjectName(item.subject_id)}</td>
                      <td>{new Date(item.due_date).toLocaleDateString('ru-RU')}</td>
                      <td><button className="btn-delete-grade" onClick={() => handleDeleteTest(item.id)}>Удалить</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
