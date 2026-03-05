let currentUserType = null;
let chatInterval = null;

function stopChatPolling() {
    if (chatInterval) {
        clearInterval(chatInterval);
        chatInterval = null;
        console.log("Chat polling stopped.");
    }
}

window.addEventListener('load', () => {
    if (document.getElementById('user-data') || document.getElementById('welcome-msg')) {
        loadHomeData();
    }

    const dashBtn = document.getElementById('nav-dashboard');
    if (dashBtn) {
        dashBtn.addEventListener('click', (e) => {
            e.preventDefault();
            stopChatPolling();
            resetDashboardHTML();
            loadHomeData();
        });
    }

    const myCoursesBtn = document.getElementById('nav-my-courses');
    if (myCoursesBtn) {
        myCoursesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            stopChatPolling();
            if (currentUserType) loadMyCourses(currentUserType);
        });
    }

    const msgBtn = document.getElementById('nav-messages');
    if (msgBtn) {
        msgBtn.addEventListener('click', (e) => {
            e.preventDefault();
            stopChatPolling();
            if (currentUserType === 2) {
                showCourseSelectionForChat();
            } else {
                showStudentCourseSelection();
            }
        });
    }
});

async function loadHomeData() {
    try {
        const response = await fetch('/api/home/');
        if (!response.ok) throw new Error("Not authenticated");
        const data = await response.json();

        currentUserType = data.user_info.user_type;
        const isTeacher = (currentUserType === 2);

        if (typeof loadNotifications === 'function') {
            loadNotifications();
        }

        const enrolledIds = data.enrolled_ids || [];

        document.getElementById('welcome-msg').innerText = `Welcome, ${data.user_info.full_name || data.user_info.username}!`;

        const statusDisplay = document.getElementById('display-status');
        if (statusDisplay) {
            statusDisplay.parentElement.style.display = isTeacher ? 'none' : 'block';
            statusDisplay.innerText = data.status || 'No status yet';
        }

        const statusUpdateSection = document.getElementById('status-update-section');
        if (statusUpdateSection) {
            statusUpdateSection.style.display = isTeacher ? 'none' : 'block';
        }

        const photoEl = document.getElementById('user-photo');
        if (photoEl) photoEl.src = data.user_info.photo || '/static/images/default-avatar.png';

        const roleTag = document.getElementById('user-role-tag');
        if (roleTag) {
            roleTag.innerText = isTeacher ? "Teacher" : "Student";
        }

        document.querySelectorAll('.teacher-panel').forEach(panel => {
            panel.style.display = isTeacher ? 'block' : 'none';
        });

        renderCourseList(data.courses, currentUserType, enrolledIds);

        if (currentUserType === 1 && typeof renderDeadlines === 'function') {
            renderDeadlines(data.upcoming_deadlines);
            const deadlineCard = document.getElementById('deadline-card');
            if (deadlineCard) deadlineCard.style.display = 'block';
        }

        if (isTeacher) fillCourseDropdown();

    } catch (error) {
        console.error('Home Data Load Error:', error);
        window.location.href = '/';
    }
}

function renderCourseList(courses, userType, enrolledIds = []) {
    const listContainer = document.getElementById('course-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    courses.forEach(course => {
        const div = document.createElement('div');
        div.className = 'course-item card';

        let actionButtons = '';
        if (userType === 1) {
            const isEnrolled = enrolledIds.includes(course.id);
            actionButtons = `
                <button class="btn-action" style="background: ${isEnrolled ? '#bdc3c7' : '#27ae60'};" 
                        onclick="${isEnrolled ? '' : `enrollInCourse(${course.id})`}" ${isEnrolled ? 'disabled' : ''}>
                    ${isEnrolled ? 'Enrolled' : 'Enroll'}
                </button>
                <button class="btn-action" style="background:#9b59b6;" onclick="submitFeedback(${course.id})">Feedback</button>
            `;
        } else {
            actionButtons = `<button class="btn-action" style="background:#e67e22;" onclick="viewStudents(${course.id}, '${course.title}')">View Students</button>`;
        }

        div.innerHTML = `
            <h4>${course.title}</h4>
            <p>${course.description || 'No description provided.'}</p>
            <div class="course-actions">${actionButtons}</div>
        `;
        listContainer.appendChild(div);
    });
}

async function showCourseSelectionForChat() {
    const response = await fetch('/api/teacher/my-courses/');
    const courses = await response.json();
    const container = document.querySelector('.content-container');

    let html = `
        <section class="card">
            <div class="card-title">Select a Course to Start Chat</div>
            <div class="course-grid">`;
    courses.forEach(c => {
        html += `
            <div class="course-item card" style="cursor:pointer; border:1px solid #eee;" onclick="showStudentSelectionForChat(${c.id}, '${c.title}')">
                <h4>${c.title}</h4>
                <p>Click to see enrolled students</p>
            </div>`;
    });
    html += `</div></section>`;
    container.innerHTML = html;
}

async function showStudentSelectionForChat(courseId, courseTitle) {
    const response = await fetch(`/api/course/${courseId}/students/`);
    const students = await response.json();
    const container = document.querySelector('.content-container');

    let html = `
        <section class="card">
            <div class="card-title">Message a Member (${courseTitle})</div>
            <div class="user-list">`;
            
    if (students.length === 0) {
        html += `<p class="text-muted">No students enrolled in this course.</p>`;
    } else {
        students.forEach(s => {
            html += `
                <div class="user-result-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee;">
                    <span style="cursor: pointer;" onclick="viewUserProfile(${s.id})">
                        <strong>${s.full_name || s.username}</strong>
                        ${s.user_type === 2 ? '<span class="badge" style="background:#e67e22; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:5px;">TEACHER</span>' : ''}
                    </span>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-action" style="background: #3498db; padding: 6px 12px; font-size: 0.85rem;" 
                                onclick="viewUserProfile(${s.id})">
                            Profile
                        </button>
                        <button class="btn-action" style="padding: 6px 12px; font-size: 0.85rem;" 
                                onclick="openChat(${s.id}, '${s.full_name || s.username}')">
                            Start Chat
                        </button>
                    </div>
                </div>`;
        });
    }
    
    html += `</div><button class="btn-action" style="margin-top:20px; background:#95a5a6;" onclick="showCourseSelectionForChat()">Back to Courses</button></section>`;
    container.innerHTML = html;
}

async function showStudentCourseSelection() {
    const response = await fetch('/api/home/');
    const data = await response.json();
    const container = document.querySelector('.content-container');

    const enrolledCourses = data.courses.filter(c => data.enrolled_ids.includes(c.id));

    let html = `
        <section class="card">
            <div class="card-title">Message Center: Select a Course</div>
            <div class="course-grid">`;

    if (enrolledCourses.length === 0) {
        html += `<p class="text-muted">You haven't enrolled in any courses yet.</p>`;
    } else {
        enrolledCourses.forEach(c => {
            html += `
                <div class="course-item card" style="cursor:pointer;" onclick="showPeopleInCourse(${c.id}, '${c.title}')">
                    <h4>${c.title}</h4>
                    <p>Click to chat with teacher or classmates</p>
                </div>`;
        });
    }
    html += `</div></section>`;
    container.innerHTML = html;
}

async function showPeopleInCourse(courseId, courseTitle) {
    const response = await fetch(`/api/course/${courseId}/students/`);
    const people = await response.json();

    if (!response.ok) {
        alert("Error: " + (people.error || "Failed to load members"));
        return;
    }

    const container = document.querySelector('.content-container');

    let html = `
        <section class="card">
            <div class="card-title">Members: ${courseTitle}</div>
            <div class="user-list">`;

    people.forEach(person => {
        html += `
            <div class="user-result-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee;">
                <span style="cursor: pointer;" onclick="viewUserProfile(${person.id})">
                    <strong>${person.full_name || person.username}</strong>
                    ${person.user_type === 2 ? '<span class="badge" style="background:#e67e22; color:white; padding:2px 6px; border-radius:4px; font-size:0.7rem; margin-left:5px;">TEACHER</span>' : ''}
                </span>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-action" style="background: #3498db; padding: 6px 12px; font-size: 0.85rem;" 
                            onclick="viewUserProfile(${person.id})">
                        Profile
                    </button>
                    <button class="btn-action" style="padding: 6px 12px; font-size: 0.85rem;" 
                            onclick="openChat(${person.id}, '${person.full_name || person.username}')">
                        Chat
                    </button>
                </div>
            </div>`;
    });

    const backFunction = (currentUserType === 2) ? 'showCourseSelectionForChat()' : 'showStudentCourseSelection()';
    
    html += `</div>
            <button class="btn-action" style="margin-top:20px; background:#95a5a6;" onclick="${backFunction}">
                Back to Course Selection
            </button>
        </section>`;
    container.innerHTML = html;
}

async function openChat(otherUserId, otherUserName) {
    const container = document.querySelector('.content-container');
    container.innerHTML = `
        <section class="card chat-panel">
            <div class="card-title">Chatting with ${otherUserName}</div>
            <div id="chat-box" style="height: 350px; overflow-y: auto; border: 1px solid #eee; padding: 15px; margin-bottom: 15px; background: #fff; border-radius: 8px;">
                Loading conversation history...
            </div>
            <div class="status-input-group">
                <input type="text" id="chat-input" placeholder="Type a message..." style="flex-grow: 1;">
                <button class="btn-action" onclick="handleSendMessage(${otherUserId})">Send</button>
            </div>
            <button class="btn-action" style="background:#95a5a6; margin-top:10px;" onclick="loadHomeData()">Exit Chat</button>
        </section>
    `;

    refreshChat(otherUserId);
    stopChatPolling();
    chatInterval = setInterval(() => refreshChat(otherUserId), 3000);
}

async function refreshChat(otherUserId) {
    try {
        const response = await fetch(`/api/chat/history/${otherUserId}/`);
        if (!response.ok) return;
        const messages = await response.json();
        const chatBox = document.getElementById('chat-box');
        if (!chatBox) return;

        chatBox.innerHTML = messages.map(m => `
            <div style="text-align: ${m.is_me ? 'right' : 'left'}; margin-bottom: 10px;">
                <div style="display: inline-block; padding: 10px; border-radius: 15px; background: ${m.is_me ? '#3498db' : '#ecf0f1'}; color: ${m.is_me ? 'white' : 'black'};">
                    <small style="display: block; font-size: 0.6rem; opacity: 0.7;">${m.timestamp}</small>
                    ${m.message}
                </div>
            </div>
        `).join('');
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (e) { console.error("Chat refresh error:", e); }
}

async function handleSendMessage(receiverId) {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    await fetch('/api/chat/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify({ receiver_id: receiverId, message: text })
    });
    input.value = '';
    refreshChat(receiverId);
}

async function performSearch() {
    const query = document.getElementById('search-box').value;
    if (!query) return;

    try {
        const response = await fetch(`/api/teacher/search-users/?q=${query}`);
        if (!response.ok) throw new Error("Search failed");

        const users = await response.json();
        const resultsBox = document.getElementById('search-results');
        resultsBox.innerHTML = '';

        users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'user-result-item';
            div.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;";
            
            div.innerHTML = `
                <div style="cursor: pointer;" onclick="viewUserProfile(${user.id})">
                    <strong>${user.full_name || user.username}</strong> 
                    <small style="color: #666;">(${user.user_type === 2 ? 'Teacher' : 'Student'})</small>
                </div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-action" style="background: #3498db; padding: 5px 10px;" 
                            onclick="viewUserProfile(${user.id})">
                        Profile
                    </button>
                    <button class="btn-action" style="background: #2ecc71; padding: 5px 10px;" 
                            onclick="openChat(${user.id}, '${user.full_name || user.username}')">
                        Chat
                    </button>
                </div>
            `;
            resultsBox.appendChild(div);
        });
    } catch (error) { console.error(error); }
}

async function handleLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    try {
        const response = await fetch('/api/auth/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await response.json();
        if (response.ok) {
            window.location.href = '/home/';
        } else {
            alert(data.error || "Login failed");
        }
    } catch (error) {
        console.error("Login error:", error);
    }
}

async function handleLogout() {
    if (!confirm("Are you sure you want to logout?")) return;

    try {
        const response = await fetch('/api/auth/logout/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });

        if (response.ok) {
            window.location.href = '/';
        } else {
            alert("Logout failed.");
        }
    } catch (error) {
        console.error("Logout error:", error);
    }
}

async function handleRegister() {
    const formData = new FormData();
    formData.append('username', document.getElementById('reg-user').value);
    formData.append('password', document.getElementById('reg-pass').value);
    formData.append('full_name', document.getElementById('reg-fullname').value);
    formData.append('user_type', document.getElementById('reg-type').value);

    const photoFile = document.getElementById('reg-photo').files[0];
    if (photoFile) formData.append('photo', photoFile);

    const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    });

    if (response.ok) {
        alert("Registration successful! Please login.");
        toggleAuth(false);
    } else {
        const errorData = await response.json();
        alert("Error: " + (errorData.error || "Registration failed"));
    }
}

function toggleAuth(showRegister) {
    document.getElementById('login-section').classList.toggle('hidden', showRegister);
    document.getElementById('register-section').classList.toggle('hidden', !showRegister);
}

async function viewStudents(courseId, courseTitle = "this course") {
    try {
        const response = await fetch(`/api/teacher/course-students/${courseId}/`);
        if (!response.ok) throw new Error("Unauthorized or Course not found");

        const students = await response.json();
        const mainContent = document.querySelector('.content-container');

        let html = `
            <section class="card">
                <div class="card-title">Students Enrolled in ${courseTitle}</div>
                <div class="user-list" style="margin-top: 20px;">
        `;

        if (students.length === 0) {
            html += `<p class="text-muted" style="padding: 10px;">No students have enrolled in this course yet.</p>`;
        } else {
            students.forEach(s => {
                html += `
                    <div class="user-result-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
                        <div class="student-info" style="cursor: pointer;" onclick="viewUserProfile(${s.id})">
                            <strong style="color: #2c3e50;">${s.full_name || s.username}</strong>
                            <small style="color: #7f8c8d; display: block;">@${s.username}</small>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-action" style="padding: 6px 12px; font-size: 0.85rem; background: #3498db;" 
                                    onclick="viewUserProfile(${s.id})">
                                Profile
                            </button>
                            <button class="btn-action" style="padding: 6px 12px; font-size: 0.85rem; background: #2ecc71;" 
                                    onclick="openChat(${s.id}, '${s.full_name || s.username}')">
                                Message
                            </button>
                        </div>
                    </div>`;
            });
        }

        html += `
                </div>
                <button class="btn-action" style="margin-top: 25px; background: #95a5a6;" 
                        onclick="loadHomeData()">
                    Back to Dashboard
                </button>
            </section>
        `;

        mainContent.innerHTML = html;

    } catch (error) {
        console.error("View Students Error:", error);
        alert("Failed to load student list: " + error.message);
    }
}

async function postStatus() {
    const statusInput = document.getElementById('status-input');
    const newStatus = statusInput.value;
    if (!newStatus) return alert("Please enter something!");

    const response = await fetch('/api/status/update/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ status: newStatus })
    });

    if (response.ok) {
        statusInput.value = '';
        loadHomeData();
    }
}

async function enrollInCourse(courseId) {
    const response = await fetch(`/api/student/enroll/${courseId}/`, {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') }
    });

    if (response.ok) {
        alert("Success! You have joined the course.");
        loadHomeData();
    } else {
        alert("Enrollment failed.");
    }
}

async function submitFeedback(courseId) {
    const text = prompt("Enter your feedback:");
    if (!text) return;

    const response = await fetch(`/api/course/${courseId}/feedback/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ content: text })
    });

    const result = await response.json();
    if (response.ok) {
        alert(result.message);
    } else {
        alert("Error: " + result.error);
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

async function handleCreateCourse() {
    const titleEl = document.getElementById('new-course-title');
    const descEl = document.getElementById('new-course-desc');

    const title = titleEl.value;
    const desc = descEl.value;

    if (!title) return alert("Please enter a course title");

    try {
        const response = await fetch('/api/teacher/create-course/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                title: title,
                description: desc
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Course Created Successfully!");
            titleEl.value = '';
            descEl.value = '';

            if (typeof fillCourseDropdown === 'function') fillCourseDropdown();
            loadHomeData();
        } else {
            alert("Error: " + (data.error || "Failed to create course"));
        }
    } catch (error) {
        console.error("Create course error:", error);
    }
}

function renderDeadlines(deadlines) {
    const container = document.getElementById('deadline-list');
    if (!container) return;
    container.innerHTML = '';

    if (!deadlines || deadlines.length === 0) {
        container.innerHTML = '<p class="text-muted" style="padding: 10px;">No upcoming deadlines.</p>';
        return;
    }

    deadlines.forEach(asgn => {
        const div = document.createElement('div');
        div.className = 'deadline-item';
        div.style = "padding: 15px; border-left: 5px solid #e74c3c; background: #fff; margin-bottom: 12px; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;";

        const dueDate = new Date(asgn.deadline).toLocaleString();

        div.innerHTML = `
            <div style="flex: 1; margin-right: 15px;">
                <strong style="display: block; font-size: 1.05rem; color: #2c3e50;">${asgn.title}</strong>
                <p style="margin: 5px 0; font-size: 0.85rem; color: #7f8c8d; line-height: 1.4;">
                    ${asgn.description ? asgn.description.substring(0, 50) + '...' : 'No instructions.'}
                </p>
                <small style="color: #e74c3c; font-weight: bold;">Due: ${dueDate}</small>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 5px; min-width: 90px;">
                <button class="btn-action" style="background: #34495e; padding: 5px; font-size: 0.75rem;" 
                        onclick="alert('${asgn.description || 'No detailed instructions available.'}')">
                    Detail
                </button>

                ${asgn.material_url ? `
                    <a href="${asgn.material_url}" target="_blank" download class="btn-action" 
                       style="background: #27ae60; padding: 5px; font-size: 0.75rem; text-decoration: none; color: white; text-align: center;">
                        Download
                    </a>
                ` : `
                    <button class="btn-action" disabled style="background: #bdc3c7; padding: 5px; font-size: 0.75rem; cursor: not-allowed;">
                        No File
                    </button>
                `}
            </div>
        `;
        container.appendChild(div);
    });
}

async function handlePublishAssignment() {
    const courseId = document.getElementById('course-dropdown').value;
    const title = document.getElementById('asgn-title').value;
    const desc = document.getElementById('asgn-desc').value;
    const deadline = document.getElementById('asgn-deadline').value;
    const fileInput = document.getElementById('asgn-material');

    if (!courseId || !title || !deadline) return alert("Please fill in all required fields!");

    const formData = new FormData();
    formData.append('course_id', courseId);
    formData.append('title', title);
    formData.append('description', desc);
    formData.append('deadline', deadline);
    if (fileInput.files[0]) formData.append('material', fileInput.files[0]);

    const response = await fetch('/api/teacher/publish-assignment/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    });

    if (response.ok) {
        alert("Assignment published!");
        loadHomeData();
    } else {
        alert("Failed to publish.");
    }
}

async function fillCourseDropdown() {
    const resp = await fetch('/api/teacher/my-courses/');
    const courses = await resp.json();
    const dropdown = document.getElementById('course-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '<option value="">-- Select Course --</option>';
    courses.forEach(c => {
        dropdown.innerHTML += `<option value="${c.id}">${c.title}</option>`;
    });
}

async function viewUserProfile(userId) {
    try {
        const response = await fetch(`/api/user/${userId}/profile/`);
        if (!response.ok) throw new Error("User profile not found");
        const data = await response.json();

        const container = document.querySelector('.content-container');
        const isTeacher = (data.user_type === 2);

        let html = `
            <section class="card animate-fade-in">
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 25px;">
                    <div class="avatar-wrapper">
                        <img src="${data.photo || '/static/images/default-avatar.png'}" 
                             style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid ${isTeacher ? '#3498db' : '#2ecc71'};">
                    </div>
                    <div>
                        <h2 style="margin:0; color: #2c3e50;">${data.full_name || data.username}</h2>
                        <span class="badge" style="background: ${isTeacher ? '#3498db' : '#2ecc71'}; color:white; padding:2px 10px; border-radius:12px; font-size: 0.8rem;">
                            ${isTeacher ? 'Faculty' : 'Student'}
                        </span>

                        ${!isTeacher ? `
                            <div style="margin-top: 12px; padding: 10px; background: #f8f9fa; border-left: 4px solid #2ecc71; border-radius: 4px;">
                                <span style="font-size: 0.85rem; color: #7f8c8d; display: block; margin-bottom: 4px;">Current Status:</span>
                                <strong style="font-style: italic; color: #2c3e50;">"${data.status || 'No status set.'}"</strong>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div style="margin-top: 25px;">
                    <h4 style="border-bottom: 2px solid #eee; padding-bottom: 8px; color: #34495e;">
                        ${isTeacher ? 'Courses Taught' : 'Enrolled Courses'}
                    </h4>
                    <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">
                        ${data.courses && data.courses.length > 0 
                            ? data.courses.map(c => `<span class="badge" style="background:#ecf0f1; color:#2c3e50; border:1px solid #bdc3c7; padding:5px 12px; border-radius:20px;">${c.title}</span>`).join('')
                            : '<p class="text-muted">No course data available.</p>'}
                    </div>
                </div>`;

        if (!isTeacher) {
            html += `
                <div style="margin-top: 30px;">
                    <h4 style="border-bottom: 2px solid #eee; padding-bottom: 8px; color: #34495e;">Upcoming Deadlines</h4>
                    <div class="profile-deadline-list" style="margin-top: 10px;">
                        ${data.deadlines && data.deadlines.length > 0 ? data.deadlines.map(d => `
                            <div style="padding: 12px; background: #fff; border: 1px solid #eee; margin-bottom: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="display: block;">${d.title}</strong>
                                    <small style="color: #e74c3c; font-weight: bold;">Due: ${new Date(d.deadline).toLocaleDateString()}</small>
                                </div>
                                ${d.material_url ? `
                                    <a href="${d.material_url}" download class="btn-action" style="font-size: 0.7rem; background: #27ae60; text-decoration: none; color: white;">📥 Download PDF</a>
                                ` : ''}
                            </div>
                        `).join('') : '<p class="text-muted">No deadlines found for this student.</p>'}
                    </div>
                </div>`;
        }

        html += `
                <div style="margin-top: 40px; display: flex; gap: 12px; border-top: 1px solid #eee; padding-top: 20px;">
                    <button class="btn-action" style="background: #3498db; flex: 1;" onclick="openChat(${data.id}, '${data.full_name || data.username}')">
                        Send Message
                    </button>
                    <button class="btn-action" style="background: #95a5a6; flex: 1;" onclick="loadHomeData()">
                        Back to Home
                    </button>
                </div>
            </section>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error("View Profile Error:", error);
        alert("Could not load user profile.");
    }
}

document.getElementById('nav-my-courses').addEventListener('click', (e) => {
    e.preventDefault();
    if (currentUserType) {
        loadMyCourses(currentUserType);
    }
});

async function loadMyCourses(userType) {
    try {
        const apiPath = (userType === 2) ? '/api/teacher/my-courses/' : '/api/home/';

        const response = await fetch(apiPath);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to fetch courses");
        }

        const coursesToDisplay = (userType === 2) ? data : data.courses;

        const enrolledIds = (userType === 1) ? coursesToDisplay.map(c => c.id) : [];

        const mainContent = document.querySelector('.content-container');
        mainContent.innerHTML = `
            <section class="card">
                <div class="card-title">My ${userType === 2 ? 'Managed' : 'Enrolled'} Courses</div>
                <div id="my-course-list-container" class="course-grid">
                    </div>
            </section>
        `;
        const originalList = document.getElementById('course-list');

        const targetContainer = document.getElementById('my-course-list-container');
        targetContainer.id = 'course-list';

        renderCourseList(coursesToDisplay, userType, enrolledIds);

        targetContainer.id = 'my-course-list-container';

    } catch (error) {
        console.error("Failed to load My Courses:", error);
        alert("Error: " + error.message);
    }
}

function resetDashboardHTML() {
    const container = document.querySelector('.content-container');
    container.innerHTML = `
        <section class="card profile-card">
            <div class="profile-header">
                <div class="avatar-wrapper">
                    <img id="user-photo" src="" alt="Profile" class="avatar">
                </div>
                <div class="profile-text">
                    <h2 id="welcome-msg" class="welcome-text">Loading...</h2>
                    <p class="status-text">Current Status: <span id="display-status">...</span></p>
                </div>
            </div>
            <div class="status-input-group">
                <input type="text" id="status-input" placeholder="What's your learning goal today?">
                <button class="btn-action" onclick="postStatus()">Post Update</button>
            </div>
        </section>

        <section class="card">
            <div class="card-title">Notifications</div>
            <div id="notification-list" style="max-height: 200px; overflow-y: auto;">
                <p class="text-muted">Loading notifications...</p>
            </div>
        </section>

        <section id="deadline-card" class="card deadline-card hidden">
            <div class="card-title">Upcoming Deadlines</div>
            <div id="deadline-list" class="deadline-container"></div>
        </section>

        <section id="teacher-search-card" class="card teacher-panel hidden">
            <div class="card-title">Directory Search</div>
            <p class="card-subtitle">Search for students or staff members by name.</p>
            <div class="status-input-group">
                <input type="text" id="search-box" placeholder="Enter name...">
                <button class="btn-action btn-teacher" onclick="performSearch()">Search</button>
            </div>
            <div id="search-results" class="search-results-box"></div>
        </section>

        <section id="teacher-create-course-card" class="card teacher-panel hidden">
            <div class="card-title">Create New Course</div>
            <p class="card-subtitle">Add a new course template to the system directory.</p>
            <div class="publish-form">
                <input type="text" id="new-course-title" placeholder="Course Title" class="form-input">
                <textarea id="new-course-desc" placeholder="Course description..." rows="2" class="form-textarea"></textarea>
                <button class="btn-action btn-teacher" onclick="handleCreateCourse()">Create Course Template</button>
            </div>
        </section>

        <section id="teacher-publish-card" class="card teacher-panel hidden">
            <div class="card-title">Publish New Assignment</div>
            <div class="publish-form">
                <label for="course-dropdown" class="form-label">Select Course:</label>
                <select id="course-dropdown" class="form-select">
                    <option value="">-- Select a course you teach --</option>
                </select>
                <input type="text" id="asgn-title" placeholder="Assignment Title" class="form-input">
                <textarea id="asgn-desc" placeholder="Requirements..." rows="3" class="form-textarea"></textarea>
                <label for="asgn-deadline" class="form-label">Submission Deadline:</label>
                <input type="datetime-local" id="asgn-deadline" class="form-input">
                <div class="file-upload-section">
                    <label>Upload Reference Materials (PDF/Images):</label>
                    <input type="file" id="asgn-material" class="file-input-raw">
                </div>
                <button class="btn-action btn-teacher" onclick="handlePublishAssignment()">Confirm Publication</button>
            </div>
        </section>

        <section class="card">
            <div class="card-title" id="course-section-title">Explore Available Courses</div>
            <div id="course-list" class="course-grid"></div>
        </section>

        <footer class="main-footer">
            <p>CM3035 Coursework - eLearning App | Student ID: [Your ID]</p>
        </footer>
    `;
}

async function loadNotifications() {
    const response = await fetch('/api/notifications/');
    const data = await response.json();
    const list = document.getElementById('notification-list');
    if (!list) return;

    if (data.length === 0) {
        list.innerHTML = '<p class="text-muted" style="padding:10px;">No new notifications.</p>';
        return;
    }

    list.innerHTML = data.map(n => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; font-size: 0.9rem;">
            <div style="color: #333;">${n.message}</div>
            <small style="color: #999;">${n.created_at}</small>
        </div>
    `).join('');
}

const settingsBtn = document.getElementById('nav-settings');
if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loadSettingsPage();
    });
}

async function loadSettingsPage() {
    stopChatPolling();
    const container = document.querySelector('.content-container');

    const response = await fetch('/api/home/');
    const data = await response.json();
    const fullName = data.user_info.full_name || data.user_info.username;
    const currentPhoto = data.user_info.photo || '/static/images/default-avatar.png';

    container.innerHTML = `
        <section class="card animate-fade-in">
            <div class="card-title">Account Settings</div>
            
            <div class="settings-section" style="margin-bottom: 30px; display: flex; gap: 30px; align-items: flex-start; flex-wrap: wrap;">
                
                <div style="text-align: center; width: 150px;">
                    <img id="settings-photo-preview" src="${currentPhoto}" 
                         style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 3px solid #eee; margin-bottom: 10px;">
                    <input type="file" id="settings-photo-input" style="display: none;" onchange="previewImage(this)">
                    <button class="btn-action" style="font-size: 0.75rem; background: #3498db; padding: 5px 10px;" 
                            onclick="document.getElementById('settings-photo-input').click()">
                        Change Photo
                    </button>
                    <button id="save-photo-btn" class="btn-action" style="display: none; background: #27ae60; margin-top: 10px; width: 100%;" 
                            onclick="handleUpdateAvatar()">
                        Save Photo
                    </button>
                </div>

                <div style="flex: 1; min-width: 250px;">
                    <h3>Profile Information</h3>
                    <div style="margin-bottom: 15px;">
                        <label style="display:block; font-size: 0.85rem; color: #666; margin-bottom: 5px;">Full Name (Read Only)</label>
                        <input type="text" class="form-input" value="${fullName}" readonly 
                               style="background-color: #f1f2f6; cursor: not-allowed; border: 1px solid #ddd; color: #7f8c8d;">
                        <small style="color: #999;">To change your official name, contact the administrator.</small>
                    </div>
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <div class="settings-section" style="max-width: 400px;">
                <h3>Security</h3>
                <div style="margin-bottom: 15px;">
                    <input type="password" id="old-pass" class="form-input" placeholder="Current Password">
                </div>
                <div style="margin-bottom: 15px;">
                    <input type="password" id="new-pass" class="form-input" placeholder="New Password">
                </div>
                <div style="margin-bottom: 20px;">
                    <input type="password" id="confirm-pass" class="form-input" placeholder="Confirm New Password">
                </div>
                <button class="btn-action" style="width: 100%; background: #2c3e50;" onclick="handleChangePassword()">
                    Update Password
                </button>
            </div>
        </section>
    `;
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('settings-photo-preview').src = e.target.result;
            document.getElementById('save-photo-btn').style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function handleUpdateAvatar() {
    const photoFile = document.getElementById('settings-photo-input').files[0];
    if (!photoFile) return;

    const formData = new FormData();
    formData.append('photo', photoFile);

    try {
        const response = await fetch('/api/auth/update-profile/', {
            method: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') },
            body: formData
        });

        if (response.ok) {
            alert("Photo updated successfully!");
            document.getElementById('save-photo-btn').style.display = 'none';
            loadHomeData(); 
        } else {
            alert("Failed to update photo.");
        }
    } catch (e) { console.error(e); }
}

async function handleChangePassword() {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmPass = document.getElementById('confirm-pass').value;

    if (newPass !== confirmPass) {
        return alert("New passwords do not match!");
    }

    try {
        const response = await fetch('/api/auth/change-password/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ old_password: oldPass, new_password: newPass })
        });

        const data = await response.json();
        if (response.ok) {
            alert(data.message);
            document.getElementById('old-pass').value = '';
            document.getElementById('new-pass').value = '';
            document.getElementById('confirm-pass').value = '';
        } else {
            alert("Error: " + data.error);
        }
    } catch (error) {
        console.error("Change password error:", error);
    }
}