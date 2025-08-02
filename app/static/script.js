document.addEventListener('DOMContentLoaded', () => {
    // --- Global DOM Elements ---
    const appContainer = document.getElementById('app');
    const mainNav = document.getElementById('main-nav');
    const mainContent = document.getElementById('main-content');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    const menuToggle = document.querySelector('.menu-toggle');
    const adminNavItem = document.getElementById('admin-nav-item');

    // Views
    const views = {
        auth: document.getElementById('auth-view'),
        dashboard: document.getElementById('dashboard-view'),
        createTicket: document.getElementById('create-ticket-view'),
        ticketDetail: document.getElementById('ticket-detail-view'),
        profile: document.getElementById('profile-view'),
        admin: document.getElementById('admin-view')
    };

    // Modals
    const modalContainer = document.getElementById('modal-container');
    const editRoleModal = document.getElementById('edit-role-modal');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalUserName = document.getElementById('modal-user-name');
    const modalUserEmail = document.getElementById('modal-user-email');
    const modalUserRole = document.getElementById('modal-user-role');
    const saveRoleBtn = document.getElementById('save-role-btn');
    const confirmationTitle = document.getElementById('confirmation-title');
    const confirmationMessage = document.getElementById('confirmation-message');
    const confirmActionBtn = document.getElementById('confirm-action-btn');

    // Profile Modals (New)
    const editProfileModal = document.getElementById('edit-profile-modal'); // Assuming you'll add these in HTML
    const changePasswordModal = document.getElementById('change-password-modal'); // Assuming you'll add these in HTML

    const toastContainer = document.getElementById('toast-container');

    // --- Simulated Backend Data (LocalStorage) ---
    // Initialize data if not present
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let tickets = JSON.parse(localStorage.getItem('tickets')) || [];
    let categories = JSON.parse(localStorage.getItem('categories')) || ['Technical', 'Billing', 'Feature Request', 'General Inquiry', 'Hardware Support'];

    // Add a default admin if none exists for easy testing
    if (!users.some(u => u.role === 'admin')) {
        users.push({
            id: 1,
            name: 'Admin User',
            email: 'admin@quickdesk.com',
            password: 'password', // In a real app, hash this!
            role: 'admin',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('users', JSON.stringify(users));
    }
    // Add a default agent if none exists
    if (!users.some(u => u.role === 'agent')) {
        users.push({
            id: 2,
            name: 'Support Agent',
            email: 'agent@quickdesk.com',
            password: 'password',
            role: 'agent',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('users', JSON.stringify(users));
    }
    // Ensure categories are always saved
    localStorage.setItem('categories', JSON.stringify(categories));


    let currentFilters = {
        status: 'all',
        category: 'all',
        myTickets: false,
        search: '',
        sortBy: 'recent', // 'recent' or 'replies'
        page: 1,
        itemsPerPage: 6
    };
    let activeTicketId = null; // Currently viewed ticket ID

    // --- Helper Functions ---

    function saveState() {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('tickets', JSON.stringify(tickets));
        localStorage.setItem('categories', JSON.stringify(categories));
    }

    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.classList.add('toast', type);
        const iconClass = {
            'info': 'fas fa-info-circle',
            'success': 'fas fa-check-circle',
            'error': 'fas fa-times-circle',
            'warning': 'fas fa-exclamation-triangle'
        }[type];
        toast.innerHTML = `
            <i class="toast-icon ${iconClass}"></i>
            <span class="toast-message">${message}</span>
        `;
        toast.style.setProperty('--toast-delay', `${duration / 1000}s`);
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, duration + 400); // 400ms for fadeOutToast animation
    }

    function showModal(modalElement) {
        modalContainer.classList.add('active');
        // Hide all modals first, then show the desired one
        document.querySelectorAll('.modal-content').forEach(modal => {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        });
        modalElement.classList.remove('hidden');
        modalElement.classList.add('active'); // For animation
    }

    function hideModal() {
        modalContainer.classList.remove('active');
        document.querySelectorAll('.modal-content').forEach(modal => {
            modal.classList.add('hidden');
            modal.classList.remove('active');
        });
    }

    function showConfirmation(title, message, onConfirmCallback) {
        confirmationTitle.textContent = title;
        confirmationMessage.textContent = message;
        // Clone and re-add to clear previous listeners
        const oldConfirmBtn = confirmActionBtn;
        const newConfirmBtn = oldConfirmBtn.cloneNode(true);
        oldConfirmBtn.parentNode.replaceChild(newConfirmBtn, oldConfirmBtn);
        newConfirmBtn.onclick = () => {
            onConfirmCallback();
            hideModal();
        };
        confirmActionBtn = newConfirmBtn; // Update the reference
        showModal(confirmationModal);
    }


    function switchView(viewElement) {
        Object.values(views).forEach(view => {
            view.classList.remove('active');
            view.classList.add('hidden');
        });
        viewElement.classList.remove('hidden');
        viewElement.classList.add('active');

        // Update active link in navigation
        document.querySelectorAll('.nav-links .nav-item').forEach(link => {
            link.classList.remove('active-link');
            if (link.dataset.navTarget && viewElement.id.startsWith(link.dataset.navTarget)) {
                link.classList.add('active-link');
            }
        });

        // Close mobile nav if open
        mainNav.classList.remove('menu-open');
        mainContent.scrollTop = 0; // Scroll to top of content when changing view
    }

    function updateNavVisibility() {
        if (currentUser) {
            mainNav.classList.remove('hidden');
            if (currentUser.role === 'admin') {
                adminNavItem.classList.remove('hidden');
            } else {
                adminNavItem.classList.add('hidden');
            }
        } else {
            mainNav.classList.add('hidden');
        }
    }

    function displayFormError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }

    function populateCategoryDropdowns() {
        const dropdowns = [
            document.getElementById('category-filter'),
            document.getElementById('ticket-category')
        ];

        dropdowns.forEach(dropdown => {
            // Clear existing options, but keep 'All' for filter
            if (dropdown.id === 'category-filter') {
                dropdown.innerHTML = '<option value="all">All Categories</option>';
            } else {
                dropdown.innerHTML = '<option value="">Select Category</option>'; // Placeholder for create ticket form
            }

            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.toLowerCase().replace(/\s/g, '-');
                option.textContent = cat;
                dropdown.appendChild(option);
            });
        });
    }

    // --- UI Rendering Functions ---

    function renderTickets() {
        const ticketGrid = document.getElementById('ticket-grid');
        ticketGrid.innerHTML = ''; // Clear existing tickets

        // Show skeletons while "loading"
        for (let i = 0; i < currentFilters.itemsPerPage; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.classList.add('ticket-card', 'skeleton');
            skeletonCard.innerHTML = `
                <div class="skeleton-line short"></div>
                <div class="skeleton-line medium"></div>
                <div class="skeleton-line long"></div>
                <div class="skeleton-line medium"></div>
            `;
            ticketGrid.appendChild(skeletonCard);
        }

        setTimeout(() => { // Simulate API delay
            const filteredTickets = tickets.filter(ticket => {
                const matchesStatus = currentFilters.status === 'all' || ticket.status.toLowerCase().replace(/\s/g, '-') === currentFilters.status;
                const matchesCategory = currentFilters.category === 'all' || ticket.category.toLowerCase().replace(/\s/g, '-') === currentFilters.category;
                const matchesMyTickets = !currentFilters.myTickets || ticket.userId === currentUser.id;
                const matchesSearch = ticket.subject.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
                                      ticket.description.toLowerCase().includes(currentFilters.search.toLowerCase());
                return matchesStatus && matchesCategory && matchesMyTickets && matchesSearch;
            });

            // Sorting
            filteredTickets.sort((a, b) => {
                if (currentFilters.sortBy === 'recent') {
                    return new Date(b.lastModified) - new Date(a.lastModified);
                } else if (currentFilters.sortBy === 'replies') {
                    return (b.comments?.length || 0) - (a.comments?.length || 0);
                }
                return 0;
            });

            const totalPages = Math.ceil(filteredTickets.length / currentFilters.itemsPerPage);
            currentFilters.page = Math.min(currentFilters.page, Math.max(1, totalPages)); // Ensure page is valid
            document.getElementById('page-info').textContent = `Page ${currentFilters.page} of ${Math.max(1, totalPages)}`;

            document.getElementById('prev-page').disabled = currentFilters.page === 1;
            document.getElementById('next-page').disabled = currentFilters.page >= totalPages;

            const startIndex = (currentFilters.page - 1) * currentFilters.itemsPerPage;
            const endIndex = startIndex + currentFilters.itemsPerPage;
            const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

            ticketGrid.innerHTML = ''; // Clear skeletons and prepare for actual content

            if (paginatedTickets.length === 0) {
                ticketGrid.innerHTML = '<p class="no-results">No tickets found matching your criteria.</p>';
                return;
            }

            paginatedTickets.forEach(ticket => {
                const ticketCard = document.createElement('div');
                ticketCard.classList.add('ticket-card');
                ticketCard.dataset.id = ticket.id;

                const user = users.find(u => u.id === ticket.userId);

                ticketCard.innerHTML = `
                    <div class="ticket-card-header">
                        <h3>${ticket.subject}</h3>
                        <span class="ticket-status ${ticket.status.toLowerCase().replace(/\s/g, '-')}">${ticket.status}</span>
                    </div>
                    <p class="ticket-meta">
                        Raised by: <strong>${user ? user.name : 'N/A'}</strong> on ${new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                    <p class="ticket-meta">Category: <span class="tag-category">${ticket.category}</span></p>
                    <p class="ticket-description-short">${ticket.description}</p>
                `;
                ticketGrid.appendChild(ticketCard);
            });
        }, 500); // Simulate network delay
    }

    function renderTicketDetail(ticketId) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) {
            showToast('Ticket not found!', 'error');
            switchView(views.dashboard);
            return;
        }

        const user = users.find(u => u.id === ticket.userId);
        const agent = ticket.assignedTo ? users.find(u => u.id === ticket.assignedTo) : null;

        document.getElementById('detail-subject').textContent = ticket.subject;
        document.getElementById('detail-status').className = `ticket-status ${ticket.status.toLowerCase().replace(/\s/g, '-')} ${ticket.status.toLowerCase()}`; // Add specific status class
        document.getElementById('detail-status').textContent = ticket.status;
        document.getElementById('detail-raised-by').textContent = user ? user.name : 'N/A';
        document.getElementById('detail-date').textContent = new Date(ticket.createdAt).toLocaleString();
        document.getElementById('detail-category').textContent = ticket.category;
        document.getElementById('detail-description').textContent = ticket.description;
        document.getElementById('detail-assigned-to').textContent = agent ? agent.name : 'N/A';


        // Attachments
        const attachmentsList = document.getElementById('detail-attachments');
        attachmentsList.innerHTML = '<h4><i class="fas fa-paperclip"></i> Attachments</h4>';
        if (ticket.attachments && ticket.attachments.length > 0) {
            const attachmentContainer = document.createElement('div');
            attachmentContainer.classList.add('attachment-items');
            ticket.attachments.forEach((file, index) => {
                // For a real app, this would be a secure download link from your server.
                // Here, it's a dummy link or a Blob URL if the file content was actually saved.
                const fileName = file.name || `attachment-${index + 1}`;
                const fileSize = file.size ? `(${(file.size / 1024 / 1024).toFixed(2)} MB)` : '';
                const link = document.createElement('a');
                link.href = '#'; // Dummy href
                link.classList.add('attachment-item');
                link.innerHTML = `<i class="fas fa-file"></i> ${fileName} ${fileSize}`;
                link.title = `Download ${fileName}`;
                // In a real app, link.href would be the actual download URL
                attachmentContainer.appendChild(link);
            });
            attachmentsList.appendChild(attachmentContainer);
        } else {
            attachmentsList.innerHTML += '<p class="no-attachments">No attachments.</p>';
        }

        // Upvote/Downvote
        document.getElementById('upvote-count').textContent = ticket.upvotes || 0;
        document.getElementById('downvote-count').textContent = ticket.downvotes || 0;
        document.getElementById('upvote-btn').dataset.ticketId = ticket.id;
        document.getElementById('downvote-btn').dataset.ticketId = ticket.id;

        // Agent Actions
        const agentActionsSection = document.getElementById('agent-actions-section');
        const assignTicketBtn = document.getElementById('assign-ticket-btn');
        const agentStatusUpdate = document.getElementById('agent-status-update');

        if (currentUser.role === 'agent') {
            agentActionsSection.classList.remove('hidden');
            assignTicketBtn.dataset.ticketId = ticket.id;
            assignTicketBtn.textContent = ticket.assignedTo === currentUser.id ? 'Assigned to You' : (ticket.assignedTo ? `Assigned to ${agent.name}` : 'Assign to Me');
            assignTicketBtn.disabled = !!ticket.assignedTo; // Disable if already assigned
            assignTicketBtn.classList.toggle('btn-secondary', !ticket.assignedTo); // Change style if disabled/assigned
            assignTicketBtn.classList.toggle('btn-info', !!ticket.assignedTo);


            agentStatusUpdate.value = ticket.status.toLowerCase().replace(/\s/g, '-');
            agentStatusUpdate.dataset.ticketId = ticket.id; // Set data-id for event delegation
        } else {
            agentActionsSection.classList.add('hidden');
        }

        // Conversation Timeline
        const conversationTimelineEntries = document.querySelector('#conversation-timeline .timeline-entries');
        conversationTimelineEntries.innerHTML = '';
        if (ticket.comments && ticket.comments.length > 0) {
            ticket.comments.forEach(comment => {
                const commentUser = users.find(u => u.id === comment.userId);
                const entry = document.createElement('div');
                entry.classList.add('timeline-entry', `${comment.role}-message`); // Use comment.role for styling
                entry.innerHTML = `
                    <div class="timeline-header">
                        <span class="timeline-author">${commentUser ? commentUser.name : 'N/A'}</span>
                        <span class="timeline-date">${new Date(comment.timestamp).toLocaleString()}</span>
                    </div>
                    <p class="timeline-content">${comment.text}</p>
                `;
                conversationTimelineEntries.appendChild(entry);
            });
        } else {
            conversationTimelineEntries.innerHTML = '<p class="no-results">No comments yet. Be the first to add one!</p>';
        }

        // Add Comment Section
        document.getElementById('comment-text').value = '';
        document.getElementById('add-comment-btn').dataset.ticketId = ticket.id;
        const commentInput = document.getElementById('comment-text');
        const addCommentButton = document.getElementById('add-comment-btn');

        if (currentUser.role === 'user' && ticket.userId !== currentUser.id) {
            commentInput.disabled = true;
            addCommentButton.disabled = true;
            commentInput.placeholder = "You can only comment on your own tickets.";
        } else {
            commentInput.disabled = false;
            addCommentButton.disabled = false;
            commentInput.placeholder = "Type your comment or update here...";
        }

        switchView(views.ticketDetail);
    }

    function renderUserManagement() {
        const userListGrid = document.getElementById('user-list-grid');
        userListGrid.innerHTML = ''; // Clear existing users

        // Show skeletons while "loading"
        for (let i = 0; i < 6; i++) { // Show 6 skeleton users
            const skeletonUser = document.createElement('div');
            skeletonUser.classList.add('user-item', 'skeleton-user');
            skeletonUser.innerHTML = `
                <div class="skeleton-line short"></div>
                <div class="skeleton-line medium"></div>
                <div class="skeleton-line short"></div>
                <div class="skeleton-line tiny"></div>
            `;
            userListGrid.appendChild(skeletonUser);
        }

        setTimeout(() => { // Simulate API delay
            userListGrid.innerHTML = ''; // Clear skeletons
            if (users.length === 0) {
                userListGrid.innerHTML = '<p class="no-results">No users registered.</p>';
                return;
            }

            users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.classList.add('user-item');
                userItem.dataset.id = user.id; // Store user ID

                userItem.innerHTML = `
                    <div class="user-info">
                        <span class="user-name">${user.name}</span>
                        <span class="user-email">${user.email}</span>
                        <span class="user-role">${user.role}</span>
                    </div>
                    <div class="user-actions">
                        <button class="btn btn-secondary btn-sm" data-action="edit-role" data-user-id="${user.id}"><i class="fas fa-edit"></i> Edit Role</button>
                        <button class="btn btn-danger btn-sm" data-action="delete-user" data-user-id="${user.id}" ${user.id === currentUser.id ? 'disabled' : ''}><i class="fas fa-trash-alt"></i> Delete</button>
                    </div>
                `;
                userListGrid.appendChild(userItem);
            });
        }, 500);
    }

    function renderCategoryManagement() {
        const categoryListGrid = document.getElementById('category-list-grid');
        categoryListGrid.innerHTML = '';

        if (categories.length === 0) {
            categoryListGrid.innerHTML = '<p class="no-results">No categories defined.</p>';
            return;
        }

        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('category-item');
            categoryItem.innerHTML = `
                <span>${category}</span>
                <div class="category-actions">
                    <button class="btn btn-danger btn-sm" data-action="delete-category" data-category-name="${category}"><i class="fas fa-trash-alt"></i> Delete</button>
                </div>
            `;
            categoryListGrid.appendChild(categoryItem);
        });
    }

    // --- Core Logic Functions (Simulating Backend Interaction) ---

    function handleLogin(email, password) {
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            currentUser = user;
            saveState();
            updateNavVisibility();
            populateCategoryDropdowns();
            renderTickets();
            switchView(views.dashboard);
            showToast(`Welcome back, ${currentUser.name}!`, 'success');
        } else {
            displayFormError(document.getElementById('auth-error'), 'Invalid email or password. Please try again.');
        }
    }

    function handleRegister(name, email, password, role) {
        if (users.some(u => u.email === email)) {
            displayFormError(document.getElementById('auth-error'), 'Email already registered. Please login or use a different email.');
            return;
        }
        const newUser = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            name,
            email,
            password, // In real app: hash this!
            role,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        saveState();
        showToast('Account created successfully! Please log in.', 'success');
        // Switch to login tab
        document.querySelector('.auth-tabs .tab-button[data-tab="login"]').click(); // Correct tab selection
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').value = password;
    }

    function handleCreateTicket(subject, description, category, attachments) {
        if (!currentUser) {
            displayFormError(document.getElementById('create-ticket-error'), 'You must be logged in to create a ticket.');
            return;
        }
        if (!subject || !description || !category) {
            displayFormError(document.getElementById('create-ticket-error'), 'Please fill in all required fields.');
            return;
        }

        const newTicket = {
            id: tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1,
            userId: currentUser.id,
            subject,
            description,
            category,
            status: 'Open',
            attachments: attachments.map(file => ({ name: file.name, size: file.size, type: file.type })), // Store relevant file info
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            assignedTo: null,
            upvotes: 0,
            downvotes: 0,
            comments: [{
                userId: currentUser.id,
                text: "Ticket created.",
                timestamp: new Date().toISOString(),
                role: currentUser.role
            }]
        };
        tickets.push(newTicket);
        saveState();
        showToast('Ticket created successfully!', 'success');
        console.log(`[Notification Mock] Email to Admin: New ticket "${newTicket.subject}" created. Status: Open.`);
        document.getElementById('create-ticket-form').reset();
        document.getElementById('selected-files').innerHTML = ''; // Clear file previews
        renderTickets(); // Re-render dashboard to show new ticket
        switchView(views.dashboard);
    }

    function updateTicketStatus(ticketId, newStatus) {
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);
        if (ticketIndex !== -1 && currentUser.role === 'agent') {
            const oldStatus = tickets[ticketIndex].status;
            tickets[ticketIndex].status = newStatus;
            tickets[ticketIndex].lastModified = new Date().toISOString();
            // Add comment about status change
            tickets[ticketIndex].comments.push({
                userId: currentUser.id,
                text: `Status changed from '${oldStatus}' to '${newStatus}'.`,
                timestamp: new Date().toISOString(),
                role: 'system' // or agent for more specific
            });
            saveState();
            showToast(`Ticket status updated to "${newStatus}".`, 'info');
            console.log(`[Notification Mock] Email to Ticket Creator (${users.find(u => u.id === tickets[ticketIndex].userId)?.email}): Ticket "${tickets[ticketIndex].subject}" status changed from "${oldStatus}" to "${newStatus}".`);
            renderTicketDetail(ticketId); // Re-render detail view
            renderTickets(); // Re-render dashboard
        } else if (ticketIndex === -1) {
            showToast('Ticket not found for status update.', 'error');
        } else {
            showToast('Permission denied to update ticket status.', 'error');
        }
    }

    function handleAddCommentToTicket(ticketId, commentText) {
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);
        if (ticketIndex !== -1 && currentUser && commentText) {
            const ticket = tickets[ticketIndex];
            // Only allow user to comment on their own tickets or if agent
            if (currentUser.role === 'user' && ticket.userId !== currentUser.id) {
                showToast("You can only comment on your own tickets.", 'error');
                return;
            }

            const newComment = {
                userId: currentUser.id,
                text: commentText,
                timestamp: new Date().toISOString(),
                role: currentUser.role // Store the role of the commenter
            };
            ticket.comments.push(newComment);
            ticket.lastModified = new Date().toISOString(); // Update last modified
            saveState();
            showToast('Comment added successfully!', 'success');
            console.log(`[Notification Mock] Email to all participants: New comment on ticket "${ticket.subject}".`);
            document.getElementById('comment-text').value = '';
            renderTicketDetail(ticketId); // Re-render to show new comment
        } else {
            showToast('Comment text cannot be empty.', 'error');
        }
    }

    function handleVote(ticketId, type) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            // Simple logic: allow multiple votes for demo. In real app, track user votes.
            if (type === 'upvote') {
                ticket.upvotes = (ticket.upvotes || 0) + 1;
                document.getElementById('upvote-count').textContent = ticket.upvotes;
                showToast('Ticket upvoted!', 'success');
            } else if (type === 'downvote') {
                ticket.downvotes = (ticket.downvotes || 0) + 1;
                document.getElementById('downvote-count').textContent = ticket.downvotes;
                showToast('Ticket downvoted.', 'info');
            }
            saveState();
        }
    }

    function handleAssignTicket(ticketId) {
        const ticketIndex = tickets.findIndex(t => t.id === ticketId);
        if (ticketIndex !== -1 && currentUser.role === 'agent') {
            const ticket = tickets[ticketIndex];
            if (ticket.assignedTo) {
                showToast(`Ticket is already assigned to ${users.find(u => u.id === ticket.assignedTo).name}.`, 'warning');
                return;
            }
            ticket.assignedTo = currentUser.id;
            ticket.status = 'In Progress'; // Automatically change status
            ticket.lastModified = new Date().toISOString();
            ticket.comments.push({
                userId: currentUser.id,
                text: `Ticket assigned to ${currentUser.name} and status set to 'In Progress'.`,
                timestamp: new Date().toISOString(),
                role: 'system' // or agent
            });
            saveState();
            showToast('Ticket assigned to you and status updated!', 'success');
            renderTicketDetail(ticketId);
            renderTickets(); // Update dashboard for status change
        } else {
            showToast('Permission denied or ticket not found.', 'error');
        }
    }

    // --- Profile Editing Functions (New) ---
    function handleEditProfile(newName, newEmail) {
        // In a real app, this would involve server-side validation and updating user data
        if (newName && newEmail) {
            // Check if new email conflicts with existing users (excluding current user)
            const emailExists = users.some(u => u.email === newEmail && u.id !== currentUser.id);
            if (emailExists) {
                showToast('Email already in use by another account.', 'error');
                return;
            }

            currentUser.name = newName;
            currentUser.email = newEmail;
            // Update the user in the main users array as well
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex !== -1) {
                users[userIndex].name = newName;
                users[userIndex].email = newEmail;
            }
            saveState();
            document.getElementById('profile-name').textContent = currentUser.name;
            document.getElementById('profile-email').textContent = currentUser.email;
            showToast('Profile updated successfully!', 'success');
            hideModal();
        } else {
            showToast('Name and Email cannot be empty.', 'error');
        }
    }

    function handleChangePassword(currentPassword, newPassword) {
        if (currentUser.password !== currentPassword) {
            showToast('Current password incorrect.', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showToast('New password must be at least 6 characters.', 'error');
            return;
        }
        if (currentPassword === newPassword) {
            showToast('New password cannot be the same as the old password.', 'warning');
            return;
        }
        // In a real app, hash newPassword before saving
        currentUser.password = newPassword;
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
        }
        saveState();
        showToast('Password changed successfully!', 'success');
        hideModal();
    }


    function handleEditUserRole(userIdToEdit, newRole) {
        const userIndex = users.findIndex(u => u.id === userIdToEdit);
        if (userIndex !== -1) {
            if (userIdToEdit === currentUser.id && newRole !== currentUser.role) {
                showToast("You cannot change your own role directly. Please ask another admin.", 'error');
                return;
            }
            users[userIndex].role = newRole;
            saveState();
            showToast(`Role for ${users[userIndex].name} updated to "${newRole}".`, 'success');
            renderUserManagement(); // Re-render admin user list
            updateNavVisibility(); // In case admin changes their own role (though restricted)
        } else {
            showToast('User not found.', 'error');
        }
    }

    function handleDeleteUser(userIdToDelete) {
        if (userIdToDelete === currentUser.id) {
            showToast("You cannot delete your own account!", 'error');
            return;
        }
        showConfirmation(
            "Confirm User Deletion",
            `Are you sure you want to permanently delete this user? All their tickets will be marked as 'Closed' and their comments removed.`,
            () => {
                users = users.filter(u => u.id !== userIdToDelete);
                tickets.forEach(ticket => {
                    if (ticket.userId === userIdToDelete) {
                        ticket.status = 'Closed'; // Mark tickets as closed
                        ticket.comments.push({
                            userId: currentUser.id, // Admin who deleted
                            text: `Ticket creator's account was deleted by Admin. This ticket has been closed.`,
                            timestamp: new Date().toISOString(),
                            role: 'system'
                        });
                    }
                    // Filter out comments by the deleted user from all tickets
                    ticket.comments = ticket.comments.filter(comment => comment.userId !== userIdToDelete);
                });
                saveState();
                showToast('User deleted successfully and their tickets updated.', 'success');
                renderUserManagement();
                renderTickets(); // Update dashboard in case any of current user's tickets were affected
            }
        );
    }

    function handleAddCategory(categoryName) {
        if (!categoryName) {
            showToast('Category name cannot be empty.', 'warning');
            return;
        }
        // Capitalize first letter for display consistency
        const formattedCategoryName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();

        if (categories.includes(formattedCategoryName)) {
            showToast('Category already exists.', 'warning');
            return;
        }
        categories.push(formattedCategoryName);
        saveState();
        showToast(`Category "${formattedCategoryName}" added.`, 'success');
        document.getElementById('new-category-name').value = '';
        populateCategoryDropdowns(); // Update all dropdowns
        renderCategoryManagement();
    }

    function handleDeleteCategory(categoryName) {
        showConfirmation(
            "Confirm Category Deletion",
            `Are you sure you want to delete the category "${categoryName}"? Tickets currently assigned to this category will remain, but this category will no longer be an option for new tickets.`,
            () => {
                categories = categories.filter(cat => cat !== categoryName);
                saveState();
                showToast(`Category "${categoryName}" deleted.`, 'success');
                populateCategoryDropdowns(); // Update all dropdowns
                renderCategoryManagement();
            }
        );
    }

    // --- Event Listeners ---

    // Theme Toggle
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.dataset.theme;
        if (currentTheme === 'dark') {
            document.body.removeAttribute('data-theme');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('theme', 'dark');
        }
    });

    // Mobile Navigation Toggle
    menuToggle.addEventListener('click', () => {
        mainNav.classList.toggle('menu-open');
    });

    // Navigation Items (delegated)
    mainNav.addEventListener('click', (e) => {
        if (e.target.closest('.nav-item') && !e.target.closest('#logout-btn')) {
            e.preventDefault();
            const navItem = e.target.closest('.nav-item');
            const targetViewName = navItem.dataset.navTarget;
            if (views[targetViewName]) {
                if (targetViewName === 'dashboard') {
                    renderTickets();
                } else if (targetViewName === 'profile') {
                    // Refresh profile info when navigating to it
                    if (currentUser) {
                        document.getElementById('profile-name').textContent = currentUser.name;
                        document.getElementById('profile-email').textContent = currentUser.email;
                        document.getElementById('profile-role').textContent = currentUser.role;
                    }
                } else if (targetViewName === 'admin' && currentUser.role === 'admin') {
                    renderUserManagement();
                    renderCategoryManagement();
                    // Auto-select first admin tab
                    const firstAdminTab = document.querySelector('.admin-tabs .tab-button');
                    if (firstAdminTab && !firstAdminTab.classList.contains('active')) {
                        firstAdminTab.click();
                    } else if (firstAdminTab && firstAdminTab.classList.contains('active')) {
                        // If already active, manually re-render based on its data-tab
                        const currentAdminTab = document.querySelector('.admin-tabs .tab-button.active');
                        if (currentAdminTab.dataset.adminTab === 'user-management') {
                            renderUserManagement();
                        } else if (currentAdminTab.dataset.adminTab === 'category-management') {
                            renderCategoryManagement();
                        }
                    }
                }
                switchView(views[targetViewName]);
            }
        }
    });

    // Logout Button
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentUser = null;
        saveState();
        updateNavVisibility();
        showToast('You have been logged out.', 'info');
        switchView(views.auth);
    });

    // Auth Tabs
    document.querySelectorAll('.auth-tabs .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.auth-tabs .tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('auth-error').style.display = 'none'; // Hide errors

            if (button.dataset.tab === 'login') {
                document.getElementById('login-form').classList.remove('hidden');
                // document.getElementById('login-form').classList.add('active'); // No need for 'active' on form directly
            } else {
                document.getElementById('register-form').classList.remove('hidden');
                // document.getElementById('register-form').classList.add('active');
            }
        });
    });

    // Login Form Submission
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        handleLogin(email, password);
    });

    // Register Form Submission
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role').value;

        // Basic client-side validation
        if (!name || !email || !password || !role) {
            displayFormError(document.getElementById('auth-error'), 'Please fill in all registration fields.');
            return;
        }
        if (password.length < 6) {
            displayFormError(document.getElementById('auth-error'), 'Password must be at least 6 characters long.');
            return;
        }
        // Simple email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            displayFormError(document.getElementById('auth-error'), 'Please enter a valid email address.');
            return;
        }

        handleRegister(name, email, password, role);
    });

    // Create Ticket Form Submission
    document.getElementById('create-ticket-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = document.getElementById('ticket-subject').value.trim();
        const description = document.getElementById('ticket-description').value.trim();
        const category = document.getElementById('ticket-category').value;
        const attachments = Array.from(document.getElementById('ticket-attachment').files);

        // Basic validation
        if (!subject || !description || !category || category === '') { // Ensure category is selected
            displayFormError(document.getElementById('create-ticket-error'), 'Please fill in all required fields.');
            return;
        }
        if (attachments.some(file => file.size > 5 * 1024 * 1024)) { // 5MB limit
            displayFormError(document.getElementById('create-ticket-error'), 'Some attachments exceed the 5MB limit.');
            return;
        }
        if (attachments.length > 5) {
            displayFormError(document.getElementById('create-ticket-error'), 'You can only upload a maximum of 5 files.');
            return;
        }

        handleCreateTicket(subject, description, category, attachments);
    });

    // Handle file selection preview
    document.getElementById('ticket-attachment').addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        const selectedFilesDiv = document.getElementById('selected-files');
        selectedFilesDiv.innerHTML = ''; // Clear previous previews

        if (files.length > 0) {
            files.forEach((file, index) => {
                const fileTag = document.createElement('span');
                fileTag.classList.add('file-tag');
                // Ensure unique data-file-index based on the actual file object if possible, or just the current index.
                // For simplicity here, we'll use array index.
                fileTag.innerHTML = `
                    <i class="fas fa-file"></i>
                    ${file.name}
                    <button type="button" class="remove-file" data-file-idx="${index}">&times;</button>
                `;
                selectedFilesDiv.appendChild(fileTag);
            });
        }
    });

    // Remove file from preview (doesn't actually remove from input file list, but visually hides it)
    document.getElementById('selected-files').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-file')) {
            const indexToRemove = parseInt(e.target.dataset.fileIdx);
            const input = document.getElementById('ticket-attachment');
            const files = new DataTransfer();
            Array.from(input.files)
                .filter((file, i) => i !== indexToRemove)
                .forEach(file => files.items.add(file));
            input.files = files.files;
            e.target.closest('.file-tag').remove(); // Remove visual tag

            // Re-render the file list after removal to update indices if needed
            // For robust handling, you might re-trigger the change event or re-render the selected files section.
            // For now, simpler approach, just remove the tag.
        }
    });


    // Dashboard Filters
    document.getElementById('status-filter').addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        currentFilters.page = 1;
        renderTickets();
    });

    document.getElementById('category-filter').addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        currentFilters.page = 1;
        renderTickets();
    });

    document.getElementById('my-tickets-filter').addEventListener('change', (e) => {
        currentFilters.myTickets = e.target.checked;
        currentFilters.page = 1;
        renderTickets();
    });

    document.getElementById('search-tickets').addEventListener('input', (e) => {
        currentFilters.search = e.target.value;
        currentFilters.page = 1;
        renderTickets();
    });

    document.getElementById('sort-by').addEventListener('change', (e) => {
        currentFilters.sortBy = e.target.value;
        currentFilters.page = 1;
        renderTickets();
    });

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentFilters.page > 1) {
            currentFilters.page--;
            renderTickets();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        // Calculate total pages based on current filters for accurate pagination
        const totalItems = tickets.filter(t => {
            const matchesStatus = currentFilters.status === 'all' || t.status.toLowerCase().replace(/\s/g, '-') === currentFilters.status;
            const matchesCategory = currentFilters.category === 'all' || t.category.toLowerCase().replace(/\s/g, '-') === currentFilters.category;
            const matchesMyTickets = !currentFilters.myTickets || t.userId === currentUser.id;
            const matchesSearch = t.subject.toLowerCase().includes(currentFilters.search.toLowerCase()) ||
                                  t.description.toLowerCase().includes(currentFilters.search.toLowerCase());
            return matchesStatus && matchesCategory && matchesMyTickets && matchesSearch;
        }).length;
        const totalPages = Math.ceil(totalItems / currentFilters.itemsPerPage);

        if (currentFilters.page < totalPages) {
            currentFilters.page++;
            renderTickets();
        }
    });

    // Ticket Card Click (delegated for dynamically added cards)
    document.getElementById('ticket-grid').addEventListener('click', (e) => {
        const ticketCard = e.target.closest('.ticket-card');
        if (ticketCard && !ticketCard.classList.contains('skeleton')) {
            activeTicketId = parseInt(ticketCard.dataset.id);
            renderTicketDetail(activeTicketId);
        }
    });

    // Ticket Detail Page Actions (delegated)
    document.getElementById('ticket-detail-view').addEventListener('click', (e) => {
        if (e.target.closest('#upvote-btn')) {
            handleVote(activeTicketId, 'upvote');
        } else if (e.target.closest('#downvote-btn')) {
            handleVote(activeTicketId, 'downvote');
        } else if (e.target.closest('#assign-ticket-btn')) {
            handleAssignTicket(activeTicketId);
        } else if (e.target.closest('#add-comment-btn')) {
            const commentText = document.getElementById('comment-text').value.trim();
            handleAddCommentToTicket(activeTicketId, commentText);
        }
    });
    // Status update dropdown
    document.getElementById('agent-status-update').addEventListener('change', (e) => {
        const ticketId = parseInt(e.target.dataset.ticketId); // Get ticket ID from dropdown's dataset
        const newStatus = e.target.value;
        if (newStatus && newStatus !== '') { // Ensure a valid status is selected
            updateTicketStatus(ticketId, newStatus);
        }
    });

    // Profile Actions (mock modals for editing)
    document.querySelector('#profile-view .profile-actions').addEventListener('click', (e) => {
        if (e.target.textContent.includes('Edit Profile')) {
            // In a real scenario, you'd open a dedicated modal or inline form
            showToast('Edit Profile functionality (mock): Imagine a modal opens for name/email.', 'info');
            // For a quick demo, we can simulate an edit prompt
            const newName = prompt("Enter new name:", currentUser.name);
            const newEmail = prompt("Enter new email:", currentUser.email);
            if (newName !== null && newEmail !== null) {
                handleEditProfile(newName, newEmail);
            }

        } else if (e.target.textContent.includes('Change Password')) {
            showToast('Change Password functionality (mock): Imagine a modal opens for old/new password.', 'info');
            const currentPass = prompt("Enter current password:");
            if (currentPass !== null) {
                const newPass = prompt("Enter new password (min 6 chars):");
                if (newPass !== null) {
                    handleChangePassword(currentPass, newPass);
                }
            }
        }
    });


    // Admin Panel Tabs
    document.querySelectorAll('.admin-tabs .tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.admin-tabs .tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            document.getElementById('user-management-panel').classList.add('hidden');
            document.getElementById('category-management-panel').classList.add('hidden');

            if (button.dataset.adminTab === 'user-management') {
                document.getElementById('user-management-panel').classList.remove('hidden');
                // document.getElementById('user-management-panel').classList.add('active'); // No need for 'active' on panel directly
                renderUserManagement();
            } else {
                document.getElementById('category-management-panel').classList.remove('hidden');
                // document.getElementById('category-management-panel').classList.add('active');
                renderCategoryManagement();
            }
        });
    });

    // Admin User Management Actions (delegated)
    document.getElementById('user-list-grid').addEventListener('click', (e) => {
        if (e.target.matches('[data-action="edit-role"]')) {
            const userId = parseInt(e.target.dataset.userId);
            const user = users.find(u => u.id === userId);
            if (user) {
                modalUserName.textContent = user.name;
                modalUserEmail.textContent = user.email;
                modalUserRole.value = user.role;
                saveRoleBtn.dataset.userId = userId; // Store ID on button
                showModal(editRoleModal);
            }
        } else if (e.target.matches('[data-action="delete-user"]')) {
            const userId = parseInt(e.target.dataset.userId);
            handleDeleteUser(userId);
        }
    });

    // Save Role Button in Modal
    saveRoleBtn.addEventListener('click', () => {
        const userId = parseInt(saveRoleBtn.dataset.userId);
        const newRole = modalUserRole.value;
        handleEditUserRole(userId, newRole);
        hideModal(); // Hide modal after action
    });

    // Admin Category Management Actions
    document.getElementById('add-category-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const newCategoryName = document.getElementById('new-category-name').value.trim();
        handleAddCategory(newCategoryName);
    });

    document.getElementById('category-list-grid').addEventListener('click', (e) => {
        if (e.target.matches('[data-action="delete-category"]')) {
            const categoryName = e.target.dataset.categoryName;
            handleDeleteCategory(categoryName);
        }
    });

    // Modal Close Buttons (delegated)
    modalContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-container') || e.target.closest('[data-modal-close]')) {
            hideModal();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalContainer.classList.contains('active')) {
            hideModal();
        }
    });


    // --- Initialization ---
    function initializeApp() {
        // Set theme from localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            document.body.removeAttribute('data-theme');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }

        if (currentUser) {
            updateNavVisibility();
            populateCategoryDropdowns();
            renderTickets(); // Initial render of dashboard
            switchView(views.dashboard);
        } else {
            // If no user, ensure auth view is active and navigation is hidden
            mainNav.classList.add('hidden');
            switchView(views.auth);
        }
    }

    initializeApp();
});