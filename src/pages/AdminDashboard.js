import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, classesAPI, subjectsAPI, scheduleAPI, gradesAPI } from '../api/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newClassForm, setNewClassForm] = useState({ grade: '', letter: '' });
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalMode, setScheduleModalMode] = useState('create');
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [activeSection, setActiveSection] = useState('users');
  const [selectedScheduleClass, setSelectedScheduleClass] = useState('');
  const [classSchedule, setClassSchedule] = useState([]);
  const [journalClassId, setJournalClassId] = useState('');
  const [journalSubjectId, setJournalSubjectId] = useState('');
  const [journalGrades, setJournalGrades] = useState([]);
  const [pendingJournalGradeValues, setPendingJournalGradeValues] = useState({});
  const [selectedJournalGrade, setSelectedJournalGrade] = useState(null);
  const [journalGradeModalForm, setJournalGradeModalForm] = useState({ value: 5, comment: '' });
  const [pendingJournalGradeStudentId, setPendingJournalGradeStudentId] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const toastTimeoutRef = useRef(null);
  const [scheduleForm, setScheduleForm] = useState({
    teacher_id: '',
    class_id: '',
    subject_id: '',
    day_of_week: '0',
    lesson_number: '1',
    room: '',
  });
  const roomOptions = ['101', '102', '103', '104', '201', '202', '203', '204', '301', '302', '303', '304', 'Спортзал', 'Актовый зал'];
  const [createForm, setCreateForm] = useState({
    username: '', email: '', full_name: '', role: 'student',
    password: '', class_id: '', child_ids: '', subject_ids: [], user_type: 'admin'
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, classesRes, subjectsRes] = await Promise.all([
          usersAPI.getUsers(),
          classesAPI.getClasses(),
          subjectsAPI.getSubjects()
        ]);
        setAllUsers(usersRes.data || []);
        setClasses(classesRes.data || []);
        setSubjects(subjectsRes.data || []);

        try {
          const statsRes = await usersAPI.getAdminStats();
          setStats(statsRes.data);
        } catch (e) {
          console.warn('Не удалось загрузить статистику:', e);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedScheduleClass) {
      setClassSchedule([]);
      return;
    }
    const loadClassSchedule = async () => {
      try {
        const res = await scheduleAPI.getClassSchedule(selectedScheduleClass);
        setClassSchedule(res.data || []);
      } catch (error) {
        console.error('Ошибка загрузки расписания класса:', error);
        setClassSchedule([]);
      }
    };
    loadClassSchedule();
  }, [selectedScheduleClass]);

  useEffect(() => {
    if (!journalClassId || !journalSubjectId) {
      setJournalGrades([]);
      return;
    }
    const loadJournalGrades = async () => {
      try {
        const res = await gradesAPI.getClassGrades(journalClassId, journalSubjectId);
        setJournalGrades(res.data || []);
      } catch (error) {
        console.error('Ошибка загрузки журнала:', error);
        setJournalGrades([]);
      }
    };
    loadJournalGrades();
  }, [journalClassId, journalSubjectId]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Удалить пользователя "${username}"?`)) return;
    try {
      await usersAPI.deleteUser(userId);
      setAllUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось удалить'));
    }
  };

  const handleShowPassword = async (userItem) => {
    try {
      const res = await usersAPI.getUserPassword(userItem.id);
      const password = res.data?.password;
      if (!password) {
        window.alert('Пароль недоступен для этого пользователя');
        return;
      }
      window.alert(`Логин: ${userItem.username}\nПароль: ${password}`);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось получить пароль'));
    }
  };

  const handleEdit = (userItem) => {
    setEditingUser(userItem);
    setEditForm({
      full_name: userItem.full_name,
      email: userItem.email,
      role: userItem.role,
      user_type: userItem.user_type || 'admin',
      subject_ids: userItem.subject_ids || [],
      class_id: userItem.class_id || '',
      child_id: userItem.child_ids?.[0] || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      const payload = {
        ...editForm,
        subject_ids: Array.isArray(editForm.subject_ids) ? editForm.subject_ids : undefined,
        child_ids: editForm.child_id ? [editForm.child_id] : [],
      };
      const res = await usersAPI.updateUser(editingUser.id, payload);
      setAllUsers(prev => prev.map(u => u.id === editingUser.id ? res.data : u));
      setEditingUser(null);
      setEditForm({});
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось обновить'));
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.username || !createForm.email || !createForm.full_name || !createForm.password) {
      window.alert('Заполните все обязательные поля');
      return;
    }
    try {
      const payload = {
        username: createForm.username,
        email: createForm.email,
        full_name: createForm.full_name,
        role: createForm.role,
        password: createForm.password,
        class_id: createForm.class_id || undefined,
        child_ids: createForm.child_ids ? [createForm.child_ids] : undefined,
        subject_ids: Array.isArray(createForm.subject_ids) && createForm.subject_ids.length > 0
          ? createForm.subject_ids
          : undefined,
        user_type: createForm.role === 'admin' ? createForm.user_type : undefined,
      };
      const res = await usersAPI.createUser(payload);
      setAllUsers(prev => [...prev, res.data]);
      setShowCreateModal(false);
      setCreateForm({ username: '', email: '', full_name: '', role: 'student', password: '', class_id: '', child_ids: '', subject_ids: [], user_type: 'admin' });
      if (stats) {
        setStats(prev => ({ ...prev, total_users: prev.total_users + 1 }));
      }
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось создать'));
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const res = await subjectsAPI.createSubject({ name: newSubjectName.trim() });
      setSubjects(prev => [...prev, res.data]);
      setNewSubjectName('');
      setShowSubjectModal(false);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось добавить предмет'));
    }
  };

  const handleCreateClass = async () => {
    if (!newClassForm.grade || !newClassForm.letter) return;
    try {
      const classLabel = `${newClassForm.grade}${newClassForm.letter.toUpperCase()}`;
      const payload = {
        name: classLabel,
        grade: Number(newClassForm.grade),
        letter: newClassForm.letter,
      };
      const res = await classesAPI.createClass(payload);
      setClasses(prev => [...prev, res.data]);
      setNewClassForm({ grade: '', letter: '' });
      setShowClassModal(false);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось добавить класс'));
    }
  };

  const filteredUsers = allUsers.filter(u => {
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchSearch = searchQuery === '' ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchRole && matchSearch;
  });

  const roleOrder = { admin: 0, teacher: 1, parent: 2, student: 3 };
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const roleDiff = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99);
    if (roleDiff !== 0) return roleDiff;
    return (a.full_name || '').localeCompare(b.full_name || '', 'ru');
  });

  const getRoleBadge = (role) => {
    const map = {
      admin: { label: 'Админ', color: '#e74c3c' },
      teacher: { label: 'Учитель', color: '#3498db' },
      student: { label: 'Ученик', color: '#27ae60' },
      parent: { label: 'Родитель', color: '#f39c12' },
    };
    const r = map[role] || { label: role, color: '#95a5a6' };
    return <span className="role-badge" style={{ backgroundColor: r.color }}>{r.label}</span>;
  };

  const getClassName = (classId) => {
    if (!classId) return '—';
    const cls = classes.find(c => c.id === classId);
    return cls ? `${cls.grade}${cls.letter}` : classId;
  };

  const getSubjectNames = (subjectIds = []) => {
    if (!Array.isArray(subjectIds) || subjectIds.length === 0) return '—';
    return subjectIds
      .map((subjectId) => subjects.find((s) => s.id === subjectId)?.name || subjectId)
      .join(', ');
  };

  const getChildName = (childIds = []) => {
    if (!Array.isArray(childIds) || childIds.length === 0) return '—';
    const names = childIds
      .map((childId) => allUsers.find((u) => u.id === childId)?.full_name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : '—';
  };

  const getUserContextValue = (u) => {
    if (u.role === 'teacher') return getSubjectNames(u.subject_ids);
    if (u.role === 'parent') return getChildName(u.child_ids);
    if (u.role === 'student') return getClassName(u.class_id);
    return '—';
  };

  const getTeacherPrimarySubjectId = (teacherId) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher || !Array.isArray(teacher.subject_ids) || teacher.subject_ids.length === 0) {
      return '';
    }
    return teacher.subject_ids[0];
  };

  const handleScheduleTeacherChange = (teacherId) => {
    const primarySubjectId = getTeacherPrimarySubjectId(teacherId);
    setScheduleForm((prev) => ({
      ...prev,
      teacher_id: teacherId,
      subject_id: primarySubjectId || prev.subject_id || '',
    }));
  };

  const handleAssignSchedule = async () => {
    if (!scheduleForm.teacher_id || !scheduleForm.class_id || !scheduleForm.subject_id) {
      window.alert('Выберите учителя, класс и предмет');
      return;
    }
    const lessonNumber = Number(scheduleForm.lesson_number);
    const dayOfWeek = Number(scheduleForm.day_of_week);
    try {
      const [teacherRes, classRes] = await Promise.all([
        scheduleAPI.getTeacherSchedule(scheduleForm.teacher_id, { day_of_week: dayOfWeek }),
        scheduleAPI.getClassSchedule(scheduleForm.class_id, { day_of_week: dayOfWeek }),
      ]);
      const teacherConflict = (teacherRes.data || []).some((item) => (
        item.lesson_number === lessonNumber && item.id !== editingScheduleId
      ));
      if (teacherConflict) {
        showToast('У этого учителя уже есть урок в этот день и номер урока', 'error');
        return;
      }
      const classConflict = (classRes.data || []).some((item) => (
        item.lesson_number === lessonNumber && item.id !== editingScheduleId
      ));
      if (classConflict) {
        showToast('У класса уже есть урок в этот день и номер урока', 'error');
        return;
      }
      const payload = {
        teacher_id: scheduleForm.teacher_id,
        class_id: scheduleForm.class_id,
        subject_id: scheduleForm.subject_id,
        day_of_week: dayOfWeek,
        lesson_number: lessonNumber,
        room: scheduleForm.room || undefined,
      };
      if (scheduleModalMode === 'edit' && editingScheduleId) {
        await scheduleAPI.updateSchedule(editingScheduleId, payload);
      } else {
        await scheduleAPI.createSchedule(payload);
      }
      setShowScheduleModal(false);
      setScheduleModalMode('create');
      setEditingScheduleId(null);
      setScheduleForm({ teacher_id: '', class_id: '', subject_id: '', day_of_week: '0', lesson_number: '1', room: '' });
      if (selectedScheduleClass === scheduleForm.class_id) {
        const refreshRes = await scheduleAPI.getClassSchedule(scheduleForm.class_id);
        setClassSchedule(refreshRes.data || []);
      }
      showToast(scheduleModalMode === 'edit' ? 'Замена сохранена' : 'Урок назначен', 'success');
    } catch (error) {
      showToast('Ошибка: ' + (error.response?.data?.detail || 'Не удалось назначить урок'), 'error');
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Удалить этот урок из расписания?')) return;
    try {
      await scheduleAPI.deleteSchedule(scheduleId);
      if (selectedScheduleClass) {
        const res = await scheduleAPI.getClassSchedule(selectedScheduleClass);
        setClassSchedule(res.data || []);
      }
      showToast('Урок удален из расписания', 'success');
    } catch (error) {
      showToast('Ошибка: ' + (error.response?.data?.detail || 'Не удалось удалить урок'), 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ visible: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2600);
  };

  const openScheduleCreateFromCell = (dayIdx, lessonNum) => {
    if (!selectedScheduleClass) {
      showToast('Сначала выберите класс', 'error');
      return;
    }
    setScheduleModalMode('create');
    setEditingScheduleId(null);
    setScheduleForm({
      teacher_id: '',
      class_id: selectedScheduleClass,
      subject_id: '',
      day_of_week: String(dayIdx),
      lesson_number: String(lessonNum),
      room: '',
    });
    setShowScheduleModal(true);
  };

  const openScheduleEditFromCell = (cell) => {
    setScheduleModalMode('edit');
    setEditingScheduleId(cell.id);
    setScheduleForm({
      teacher_id: cell.teacher_id || '',
      class_id: cell.class_id || selectedScheduleClass || '',
      subject_id: cell.subject_id || '',
      day_of_week: String(cell.day_of_week),
      lesson_number: String(cell.lesson_number),
      room: cell.room || '',
    });
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setScheduleModalMode('create');
    setEditingScheduleId(null);
  };

  const handleUpdateJournalGrade = async (gradeId, payload) => {
    const value = parseInt(payload?.value, 10);
    if (!value || value < 1 || value > 5) {
      window.alert('Оценка должна быть от 1 до 5');
      return;
    }
    if (!payload?.comment) {
      window.alert('Выберите причину выставления оценки');
      return;
    }
    try {
      await gradesAPI.updateGrade(gradeId, {
        value,
        comment: payload?.comment,
      });
      const res = await gradesAPI.getClassGrades(journalClassId, journalSubjectId);
      setJournalGrades(res.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось обновить оценку'));
    }
  };

  const handleDeleteJournalGrade = async (gradeId) => {
    if (!window.confirm('Удалить оценку из журнала?')) return;
    try {
      await gradesAPI.deleteGrade(gradeId);
      const res = await gradesAPI.getClassGrades(journalClassId, journalSubjectId);
      setJournalGrades(res.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось удалить оценку'));
    }
  };

  const handleApplyJournalGradeForStudent = async (studentId) => {
    const value = parseInt(pendingJournalGradeValues[studentId], 10);
    if (!value || value < 1 || value > 5) {
      window.alert('Введите оценку от 1 до 5');
      return;
    }
    setPendingJournalGradeStudentId(studentId);
    setJournalGradeModalForm({ value, comment: '' });
  };

  const handleConfirmCreateJournalGrade = async () => {
    if (!pendingJournalGradeStudentId) return;
    const value = parseInt(journalGradeModalForm.value, 10);
    if (!value || value < 1 || value > 5) {
      window.alert('Введите оценку от 1 до 5');
      return;
    }
    if (!journalGradeModalForm.comment) {
      window.alert('Выберите причину выставления оценки');
      return;
    }
    try {
      await gradesAPI.createGrade({
        student_id: pendingJournalGradeStudentId,
        subject_id: journalSubjectId,
        value,
        date: new Date().toISOString().split('T')[0],
        teacher_id: user?.id,
        comment: journalGradeModalForm.comment,
      });
      setPendingJournalGradeValues((prev) => ({ ...prev, [pendingJournalGradeStudentId]: '' }));
      setPendingJournalGradeStudentId(null);
      const res = await gradesAPI.getClassGrades(journalClassId, journalSubjectId);
      setJournalGrades(res.data || []);
    } catch (error) {
      window.alert('Ошибка: ' + (error.response?.data?.detail || 'Не удалось выставить оценку'));
    }
  };

  const openJournalGradeModal = (grade) => {
    setSelectedJournalGrade(grade);
    setJournalGradeModalForm({
      value: grade.value,
      comment: grade.comment || '',
    });
  };

  const handleSaveJournalGradeModal = async () => {
    if (!selectedJournalGrade) return;
    await handleUpdateJournalGrade(selectedJournalGrade.id, journalGradeModalForm);
    setSelectedJournalGrade(null);
  };

  const roleLabels = { all: 'Все', admin: 'Админы', teacher: 'Учителя', student: 'Ученики', parent: 'Родители' };
  const students = allUsers.filter((u) => u.role === 'student');
  const teachers = allUsers.filter((u) => u.role === 'teacher');
  const scheduleDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const maxLessons = [1, 2, 3, 4, 5, 6, 7, 8];
  const journalStudents = students
    .filter((s) => journalClassId && s.class_id === journalClassId)
    .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ru'));
  const sortedJournalGrades = [...journalGrades].sort((a, b) => new Date(b.date) - new Date(a.date));
  const journalRows = journalStudents.map((student) => {
    const grades = sortedJournalGrades.filter((g) => g.student_id === student.id);
    const average = grades.length
      ? (grades.reduce((sum, g) => sum + g.value, 0) / grades.length).toFixed(2)
      : null;
    return {
      studentId: student.id,
      studentName: student.full_name,
      grades,
      average,
    };
  });

  if (loading) return <div className="admin-loading">Загрузка...</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Администрирование</h1>
        <p className="admin-subtitle">Управление пользователями и системой</p>
      </div>

      <div className="admin-section-tabs">
        <div className="admin-section-tabs-inner">
          <button className={`filter-tab ${activeSection === 'users' ? 'active' : ''}`} onClick={() => setActiveSection('users')}>Пользователи</button>
          <button className={`filter-tab ${activeSection === 'schedule' ? 'active' : ''}`} onClick={() => setActiveSection('schedule')}>Расписание</button>
          <button className={`filter-tab ${activeSection === 'journal' ? 'active' : ''}`} onClick={() => setActiveSection('journal')}>Журнал класса</button>
        </div>
      </div>

      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card stat-total">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <div className="stat-number">{stats.total_users}</div>
              <div className="stat-label">Всего</div>
            </div>
          </div>
          <div className="admin-stat-card stat-admins">
            <div className="stat-icon">🛡️</div>
            <div className="stat-info">
              <div className="stat-number">{stats.admins}</div>
              <div className="stat-label">Админы</div>
            </div>
          </div>
          <div className="admin-stat-card stat-teachers">
            <div className="stat-icon">👨‍🏫</div>
            <div className="stat-info">
              <div className="stat-number">{stats.teachers}</div>
              <div className="stat-label">Учителя</div>
            </div>
          </div>
          <div className="admin-stat-card stat-students">
            <div className="stat-icon">🎓</div>
            <div className="stat-info">
              <div className="stat-number">{stats.students}</div>
              <div className="stat-label">Ученики</div>
            </div>
          </div>
          <div className="admin-stat-card stat-parents">
            <div className="stat-icon">👪</div>
            <div className="stat-info">
              <div className="stat-number">{stats.parents}</div>
              <div className="stat-label">Родители</div>
            </div>
          </div>
          <div className="admin-stat-card stat-classes">
            <div className="stat-icon">🏫</div>
            <div className="stat-info">
              <div className="stat-number">{stats.classes}</div>
              <div className="stat-label">Классы</div>
            </div>
          </div>
          <div className="admin-stat-card stat-subjects">
            <div className="stat-icon">📚</div>
            <div className="stat-info">
              <div className="stat-number">{stats.subjects}</div>
              <div className="stat-label">Предметы</div>
            </div>
          </div>
          <div className="admin-stat-card stat-grades">
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <div className="stat-number">{stats.grades}</div>
              <div className="stat-label">Оценки</div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'users' && (
        <>
      <div className="admin-filters">
        <div className="filter-tabs">
          {Object.entries(roleLabels).map(([key, label]) => (
            <button key={key} className={`filter-tab ${filterRole === key ? 'active' : ''}`}
              onClick={() => setFilterRole(key)}>{label}</button>
          ))}
        </div>
        <input type="text" className="search-input" placeholder="Поиск..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        <button className="btn-create-user" onClick={() => setShowCreateModal(true)}>+ Пользователь</button>
        <button className="btn-create-user" onClick={() => setShowSubjectModal(true)}>+ Предмет</button>
        <button className="btn-create-user" onClick={() => setShowClassModal(true)}>+ Класс</button>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Email</th>
              <th>Роль</th>
              <th>Класс / Предмет / Ребенок</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">{u.full_name?.[0] || '?'}</div>
                    <div className="user-info">
                      <div className="user-name">{u.full_name}</div>
                      <div className="user-username">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="email-cell">{u.email}</td>
                <td>{getRoleBadge(u.role)}</td>
                <td>{getUserContextValue(u)}</td>
                <td className="actions-cell">
                  <button
                    className="action-btn btn-edit"
                    onClick={() => handleShowPassword(u)}
                    title="Показать пароль"
                  >
                    🔑
                  </button>
                  <button className="action-btn btn-edit" onClick={() => handleEdit(u)} title="Редактировать">✏️</button>
                  {u.id !== user?.id && u.user_type !== 'super_admin' && (
                    <button className="action-btn btn-delete" onClick={() => handleDelete(u.id, u.username)} title="Удалить">🗑️</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && <div className="no-results">Не найдено</div>}
      </div>
      </>
      )}

      {activeSection === 'schedule' && (
        <div className="schedule-admin-section">
          <div className="schedule-admin-header">
            <div className="form-group">
              <label>Класс</label>
              <select value={selectedScheduleClass} onChange={(e) => {
                setSelectedScheduleClass(e.target.value);
                setJournalClassId(e.target.value);
              }}>
                <option value="">Выберите класс</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>)}
              </select>
            </div>
            <div className="schedule-admin-hint">Нажмите на ячейку с "—", чтобы назначить урок. Нажмите на занятую ячейку для замены учителя/предмета.</div>
          </div>

          {selectedScheduleClass && (
            <div className="admin-table-wrapper">
              <table className="admin-table schedule-grid-table">
                <thead>
                  <tr>
                    <th>Урок</th>
                    {scheduleDays.map((day, idx) => <th key={day}>{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {maxLessons.map((lessonNum) => (
                    <tr key={lessonNum}>
                      <td>{lessonNum}</td>
                      {scheduleDays.map((_, dayIdx) => {
                        const cell = classSchedule.find((s) => s.day_of_week === dayIdx && s.lesson_number === lessonNum);
                        return (
                          <td
                            key={`${dayIdx}-${lessonNum}`}
                            className={`schedule-grid-cell ${cell ? 'filled' : 'empty'}`}
                            onClick={() => (cell ? openScheduleEditFromCell(cell) : openScheduleCreateFromCell(dayIdx, lessonNum))}
                          >
                            {cell ? (
                              <div className="schedule-cell">
                                <div>{subjects.find((s) => s.id === cell.subject_id)?.name || cell.subject_id}</div>
                                <div className="schedule-cell-sub">{teachers.find((t) => t.id === cell.teacher_id)?.full_name || cell.teacher_id}</div>
                                {cell.room && <div className="schedule-cell-room">Каб. {cell.room}</div>}
                                <button className="btn-delete-grade" onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(cell.id); }}>Удалить</button>
                              </div>
                            ) : <span className="schedule-empty-marker">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {activeSection === 'journal' && (
        <div className="schedule-admin-section">
          <div className="admin-filters journal-filters">
            <div className="form-group">
              <label>Класс</label>
              <select value={journalClassId} onChange={(e) => setJournalClassId(e.target.value)}>
                <option value="">Выберите класс</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Предмет</label>
              <select value={journalSubjectId} onChange={(e) => setJournalSubjectId(e.target.value)}>
                <option value="">Выберите предмет</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="admin-table-wrapper journal-admin-wrapper journal-like-teacher">
            <div className="journal-header">
              <h3>
                Журнал: {journalClassId ? getClassName(journalClassId) : '—'} - {journalSubjectId ? subjects.find((s) => s.id === journalSubjectId)?.name || journalSubjectId : '—'}
              </h3>
              <span className="journal-meta">
                Учеников: {journalRows.length} | Оценок: {journalGrades.length}
              </span>
            </div>
            <table className="admin-table teacher-like-journal-table">
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
                              onClick={() => openJournalGradeModal(grade)}
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
                      <div className="row-actions">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          className="inline-grade-input"
                          value={pendingJournalGradeValues[row.studentId] ?? ''}
                          onChange={(e) => setPendingJournalGradeValues((prev) => ({ ...prev, [row.studentId]: e.target.value }))}
                          placeholder="1-5"
                          title="Новая оценка"
                        />
                        <button
                          className="btn-apply-grade"
                          onClick={() => handleApplyJournalGradeForStudent(row.studentId)}
                          title="Применить"
                        >
                          ✓
                        </button>
                        {row.grades[0] && (
                          <button className="btn-delete-grade" onClick={() => handleDeleteJournalGrade(row.grades[0].id)} title="Удалить последнюю оценку">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!journalClassId && <div className="no-results">Сначала выберите класс</div>}
            {journalClassId && journalRows.length === 0 && <div className="no-results">Нет учеников для выбранного класса</div>}
          </div>
        </div>
      )}
      {selectedJournalGrade && (
        <div className="modal-overlay" onClick={() => setSelectedJournalGrade(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Оценка ученика</h2>
              <button className="modal-close" onClick={() => setSelectedJournalGrade(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grade-detail-row"><strong>Ученик:</strong> {students.find((s) => s.id === selectedJournalGrade.student_id)?.full_name || selectedJournalGrade.student_id}</div>
              <div className="grade-detail-row"><strong>Дата:</strong> {new Date(selectedJournalGrade.date).toLocaleDateString('ru-RU')}</div>
              <div className="form-group">
                <label>Оценка</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={journalGradeModalForm.value}
                  onChange={(e) => setJournalGradeModalForm((prev) => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Причина / комментарий</label>
                <select
                  value={journalGradeModalForm.comment}
                  onChange={(e) => setJournalGradeModalForm((prev) => ({ ...prev, comment: e.target.value }))}
                >
                  <option value="">Выберите причину</option>
                  {gradeReasonOptions.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setSelectedJournalGrade(null)}>Отмена</button>
              <button className="btn-delete-grade" onClick={() => handleDeleteJournalGrade(selectedJournalGrade.id)}>Удалить</button>
              <button className="btn-save" onClick={handleSaveJournalGradeModal}>Подтвердить</button>
            </div>
          </div>
        </div>
      )}
      {pendingJournalGradeStudentId && (
        <div className="modal-overlay" onClick={() => setPendingJournalGradeStudentId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Подтверждение оценки</h2>
              <button className="modal-close" onClick={() => setPendingJournalGradeStudentId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grade-detail-row"><strong>Ученик:</strong> {students.find((s) => s.id === pendingJournalGradeStudentId)?.full_name || pendingJournalGradeStudentId}</div>
              <div className="form-group">
                <label>Оценка</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={journalGradeModalForm.value}
                  onChange={(e) => setJournalGradeModalForm((prev) => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Причина выставления оценки</label>
                <select
                  value={journalGradeModalForm.comment}
                  onChange={(e) => setJournalGradeModalForm((prev) => ({ ...prev, comment: e.target.value }))}
                >
                  <option value="">Выберите причину</option>
                  {gradeReasonOptions.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setPendingJournalGradeStudentId(null)}>Отмена</button>
              <button className="btn-save" onClick={handleConfirmCreateJournalGrade}>Подтвердить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Редактирование</h2>
              <button className="modal-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Полное имя</label>
                <input type="text" value={editForm.full_name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editForm.email || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Роль</label>
                <select value={editForm.role || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}>
                  <option value="student">Ученик</option>
                  <option value="teacher">Учитель</option>
                  <option value="parent">Родитель</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              {editForm.role === 'student' && (
                <div className="form-group">
                  <label>Класс</label>
                  <select value={editForm.class_id || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, class_id: e.target.value }))}>
                    <option value="">Не выбран</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>)}
                  </select>
                </div>
              )}
              {editForm.role === 'teacher' && (
                <>
                  <div className="form-group">
                    <label>Предметы</label>
                    <select
                      multiple
                      value={editForm.subject_ids || []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setEditForm(prev => ({ ...prev, subject_ids: selected }));
                      }}
                    >
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Класс</label>
                    <select value={editForm.class_id || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, class_id: e.target.value }))}>
                      <option value="">Не выбран</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>)}
                    </select>
                  </div>
                </>
              )}
              {editForm.role === 'parent' && (
                <div className="form-group">
                  <label>Ребенок</label>
                  <select value={editForm.child_id || ''} onChange={(e) => setEditForm(prev => ({ ...prev, child_id: e.target.value }))}>
                    <option value="">Не выбран</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
              {editForm.role === 'admin' && (
                <div className="form-group">
                  <label>Тип администратора</label>
                  <select value={editForm.user_type || 'admin'}
                    onChange={(e) => setEditForm(prev => ({ ...prev, user_type: e.target.value }))}>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setEditingUser(null)}>Отмена</button>
              <button className="btn-save" onClick={handleSaveEdit}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Новый пользователь</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Логин *</label>
                  <input type="text" value={createForm.username}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))} placeholder="ivanov_i" />
                </div>
                <div className="form-group">
                  <label>Полное имя *</label>
                  <input type="text" value={createForm.full_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Иванов Иван Иванович" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))} placeholder="ivanov@school.ru" />
                </div>
                <div className="form-group">
                  <label>Пароль *</label>
                  <input type="text" value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Минимум 6 символов" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Роль</label>
                  <select value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}>
                    <option value="student">Ученик</option>
                    <option value="teacher">Учитель</option>
                    <option value="parent">Родитель</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
                {createForm.role === 'student' && (
                  <div className="form-group">
                    <label>Класс</label>
                    <select value={createForm.class_id}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, class_id: e.target.value }))}>
                      <option value="">Не выбран</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>)}
                    </select>
                  </div>
                )}
                {createForm.role === 'parent' && (
                  <div className="form-group">
                    <label>Ребенок</label>
                    <select value={createForm.child_ids}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, child_ids: e.target.value }))}>
                      <option value="">Не выбран</option>
                      {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                )}
                {createForm.role === 'teacher' && (
                  <div className="form-group">
                    <label>Предметы</label>
                    <select
                      multiple
                      value={createForm.subject_ids || []}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setCreateForm(prev => ({ ...prev, subject_ids: selected }));
                      }}
                    >
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {createForm.role === 'admin' && (
                  <div className="form-group">
                    <label>Тип администратора</label>
                    <select value={createForm.user_type}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, user_type: e.target.value }))}>
                      <option value="admin">admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>Отмена</button>
              <button className="btn-save" onClick={handleCreateUser}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {showSubjectModal && (
        <div className="modal-overlay" onClick={() => setShowSubjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Новый предмет</h2>
              <button className="modal-close" onClick={() => setShowSubjectModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Название предмета</label>
                <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="Например: География" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowSubjectModal(false)}>Отмена</button>
              <button className="btn-save" onClick={handleCreateSubject}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className="modal-overlay" onClick={() => setShowClassModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Новый класс</h2>
              <button className="modal-close" onClick={() => setShowClassModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row class-form-row">
                <div className="form-group">
                  <label>Номер класса</label>
                  <input type="number" min="1" max="11" value={newClassForm.grade} onChange={(e) => setNewClassForm(prev => ({ ...prev, grade: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Буква</label>
                  <input type="text" maxLength="1" value={newClassForm.letter} onChange={(e) => setNewClassForm(prev => ({ ...prev, letter: e.target.value.toUpperCase() }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowClassModal(false)}>Отмена</button>
              <button className="btn-save" onClick={handleCreateClass}>Создать</button>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="modal-overlay" onClick={closeScheduleModal}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{scheduleModalMode === 'edit' ? 'Замена/редактирование урока' : 'Назначить урок учителю'}</h2>
              <button className="modal-close" onClick={closeScheduleModal}>✕</button>
            </div>
            <div className="modal-body">
              <p className="admin-helper-text">
                {scheduleModalMode === 'edit'
                  ? 'Измените учителя или предмет и сохраните замену.'
                  : 'Класс, день и номер урока уже выбраны по ячейке расписания.'}
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label>Учитель</label>
                  <select value={scheduleForm.teacher_id} onChange={(e) => handleScheduleTeacherChange(e.target.value)}>
                    <option value="">Выберите учителя</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                {scheduleModalMode === 'create' && (
                <div className="form-group">
                  <label>Класс</label>
                  <select value={scheduleForm.class_id} onChange={(e) => setScheduleForm((prev) => ({ ...prev, class_id: e.target.value }))} disabled={!!selectedScheduleClass}>
                    <option value="">Выберите класс</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.grade}{c.letter}</option>)}
                  </select>
                </div>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Предмет</label>
                  <select value={scheduleForm.subject_id} onChange={(e) => setScheduleForm((prev) => ({ ...prev, subject_id: e.target.value }))}>
                    <option value="">Выберите предмет</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                {scheduleModalMode === 'create' && (
                <div className="form-group">
                  <label>День недели</label>
                  <select value={scheduleForm.day_of_week} onChange={(e) => setScheduleForm((prev) => ({ ...prev, day_of_week: e.target.value }))} disabled>
                    <option value="0">Понедельник</option>
                    <option value="1">Вторник</option>
                    <option value="2">Среда</option>
                    <option value="3">Четверг</option>
                    <option value="4">Пятница</option>
                    <option value="5">Суббота</option>
                    <option value="6">Воскресенье</option>
                  </select>
                </div>
                )}
              </div>
              {scheduleModalMode === 'create' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Номер урока</label>
                  <input type="number" min="1" max="12" value={scheduleForm.lesson_number} onChange={(e) => setScheduleForm((prev) => ({ ...prev, lesson_number: e.target.value }))} disabled />
                </div>
                <div className="form-group">
                  <label>Кабинет</label>
                  <select value={scheduleForm.room} onChange={(e) => setScheduleForm((prev) => ({ ...prev, room: e.target.value }))}>
                    <option value="">Необязательно</option>
                    {roomOptions.map((room) => <option key={room} value={room}>{room}</option>)}
                  </select>
                </div>
              </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={closeScheduleModal}>Отмена</button>
              <button className="btn-save" onClick={handleAssignSchedule}>{scheduleModalMode === 'edit' ? 'Сохранить замену' : 'Назначить'}</button>
            </div>
          </div>
        </div>
      )}
      {toast.visible && <div className={`admin-toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
};

export default AdminDashboard;
