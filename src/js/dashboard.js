class ProjectManager {
    constructor() {
        this.initializeUI();
        this.loadProjects();
    }

    initializeUI() {
        // New Project button
        const newProjectBtn = document.getElementById('newProjectBtn');
        const modal = document.getElementById('newProjectModal');
        const form = document.getElementById('newProjectForm');
        const cancelBtn = document.getElementById('cancelProject');

        newProjectBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });

        // Close on clicking outside the modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                form.reset();
            }
        });

        // Prevent clicks inside modal from closing it
        modal.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            form.reset();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const projectName = document.getElementById('projectName').value.trim();
            if (projectName) {
                this.createNewProject(projectName);
                modal.style.display = 'none';
                form.reset();
            }
        });
    }

    loadProjects() {
        const projects = this.getProjects();
        const projectsList = document.getElementById('projectsList');
        const noProjectsMessage = document.getElementById('noProjectsMessage');
        projectsList.innerHTML = '';

        // Show/hide the no projects message
        noProjectsMessage.style.display = projects.length === 0 ? 'table-row-group' : 'none';

        projects.forEach(project => {
            const row = document.createElement('tr');
            
            row.className = 'project-row';
            row.dataset.href = `src/pages/app.html?project=${encodeURIComponent(project.id)}`;
            row.addEventListener('click', (e) => {
                // Don't navigate if clicking the delete button
                if (!e.target.closest('.delete-btn')) {
                    window.location.href = row.dataset.href;
                }
            });

            // Project Name column
            const nameCell = document.createElement('td');
            nameCell.className = 'project-name';
            nameCell.textContent = project.name;

            // Date column
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(project.createdAt).toLocaleDateString();

            // Status column
            const statusCell = document.createElement('td');
            const statusBadge = document.createElement('span');
            
            // Get project state to determine status
            const projectState = localStorage.getItem(`packTracker_${project.id}`);
            const hasStarted = projectState && JSON.parse(projectState).packs.some(pack => pack.status !== 'unopened');
            
            let statusClass, statusText;
            if (project.completed) {
                statusClass = 'completed';
                statusText = 'Completed';
            } else if (hasStarted) {
                statusClass = 'in-progress';
                statusText = 'In Progress';
            } else {
                statusClass = 'not-started';
                statusText = 'Not Started';
            }
            
            statusBadge.className = `status-badge ${statusClass}`;
            statusBadge.textContent = statusText;
            statusCell.appendChild(statusBadge);

            // Actions column
            const actionsCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = this.getTrashIconSVG();
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent row click when clicking delete
                this.deleteProject(project.id);
            });
            actionsCell.appendChild(deleteBtn);

            row.appendChild(nameCell);
            row.appendChild(dateCell);
            row.appendChild(statusCell);
            row.appendChild(actionsCell);
            projectsList.appendChild(row);
        });
    }

    createNewProject(name) {
        const projects = this.getProjects();
        const newProject = {
            id: Date.now().toString(),
            name: name,
            createdAt: new Date().toISOString(),
            completed: false
        };

        projects.push(newProject);
        localStorage.setItem('packTrackerProjects', JSON.stringify(projects));
        
        // Create project-specific storage key
        const initialState = {
            packs: new Array(60).fill(null).map((_, index) => ({
                number: index + 1,
                status: 'unopened',
                team: null
            })),
            teamsPulled: [],
            actionHistory: []
        };
        localStorage.setItem(`packTracker_${newProject.id}`, JSON.stringify(initialState));
        
        this.loadProjects();
        window.location.href = `home.html?project=${encodeURIComponent(newProject.id)}`;
    }

    deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project?')) return;

        const projects = this.getProjects().filter(p => p.id !== projectId);
        localStorage.setItem('packTrackerProjects', JSON.stringify(projects));
        localStorage.removeItem(`packTracker_${projectId}`);
        this.loadProjects();
    }

    getProjects() {
        const projects = localStorage.getItem('packTrackerProjects');
        return projects ? JSON.parse(projects) : [];
    }

    getTrashIconSVG() {
        return `<svg class="trash-icon" viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>`;
    }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.projectManager = new ProjectManager();
});