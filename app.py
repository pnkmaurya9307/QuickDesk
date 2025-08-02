# app.py
from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
import os
import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_key_here' # **CHANGE THIS IN PRODUCTION**
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quickdesk.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# --- Models ---
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='end_user') # 'end_user', 'support_agent', 'admin'
    tickets = db.relationship('Ticket', backref='author', lazy=True)
    comments = db.relationship('Comment', backref='comment_author', lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    tickets = db.relationship('Ticket', backref='category', lazy=True)

    def __repr__(self):
        return f'<Category {self.name}>'

class Ticket(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='Open') # Open, In Progress, Resolved, Closed
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    comments = db.relationship('Comment', backref='ticket', lazy=True, cascade="all, delete-orphan") # Added cascade

    def __repr__(self):
        return f'<Ticket {self.subject}>'

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('ticket.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    comment_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)

    def __repr__(self):
        return f'<Comment {self.id}>'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Routes ---

@app.route('/')
def index():
    if current_user.is_authenticated:
        if current_user.role == 'admin':
            return redirect(url_for('admin_dashboard'))
        elif current_user.role == 'support_agent':
            return redirect(url_for('agent_dashboard'))
        elif current_user.role=='end_user':
            return redirect(url_for('user_dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        existing_user = User.query.filter_by(username=username).first()
        existing_email = User.query.filter_by(email=email).first()
        if existing_user:
            flash('Username already taken. Please choose a different one.', 'danger')
        elif existing_email:
            flash('Email already registered. Please use a different email.', 'danger')
        else:
            user = User(username=username, email=email, role='end_user')
            user.set_password(password)
            db.session.add(user)
            db.session.commit()
            flash('Account created successfully! Please log in.', 'success')
            return redirect(url_for('login'))
    return render_template('auth/register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user)
            flash(f'Welcome back, {user.username}!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page or url_for('index'))
        else:
            flash('Login Unsuccessful. Please check email and password', 'danger')
    return render_template('auth/login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@app.route('/dashboard/user')
@login_required
def user_dashboard():
    if current_user.role not in ['end_user', 'admin']: # Admin can also see their tickets
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))

    # Filtering and sorting logic
    status_filter = request.args.get('status', 'all')
    category_filter = request.args.get('category', 'all')
    sort_by = request.args.get('sort_by', 'recently_modified') # most_replied, recently_modified

    query = Ticket.query.filter_by(user_id=current_user.id)

    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    if category_filter != 'all':
        category = Category.query.filter_by(name=category_filter).first()
        if category:
            query = query.filter_by(category_id=category.id)

    if sort_by == 'most_replied':
        # This requires joining with comments and counting, more complex for a simple query
        # For hackathon, might simplify or do in Python
        # A quick way (not truly "most replied" without a join/subquery)
        tickets = sorted(query.all(), key=lambda t: len(t.comments), reverse=True)
    else: # recently_modified
        tickets = query.order_by(Ticket.updated_at.desc()).all()

    categories = Category.query.all()
    return render_template('tickets/view_tickets.html', tickets=tickets, categories=categories,
                           selected_status=status_filter, selected_category=category_filter, selected_sort=sort_by)

@app.route('/ticket/create', methods=['GET', 'POST'])
@login_required
def create_ticket():
    if request.method == 'POST':
        subject = request.form['subject']
        description = request.form['description']
        category_name = request.form['category']

        category = Category.query.filter_by(name=category_name).first()
        if not category:
            flash('Invalid category selected.', 'danger')
            return redirect(url_for('create_ticket'))

        # Handle attachment (basic placeholder)
        attachment_file = request.files.get('attachment')
        attachment_filename = None
        if attachment_file and attachment_file.filename != '':
            # In a real app, you'd save this to a secure location (e.g., S3 or a dedicated uploads folder)
            # For hackathon, you might just store filename and skip actual saving for time.
            # Example: attachment_filename = secure_filename(attachment_file.filename)
            # attachment_file.save(os.path.join(app.config['UPLOAD_FOLDER'], attachment_filename))
            flash('Attachment functionality is a placeholder. File not saved.', 'warning')
            attachment_filename = attachment_file.filename # Just store the name for now

        ticket = Ticket(
            user_id=current_user.id,
            category_id=category.id,
            subject=subject,
            description=description,
            status='Open'
        )
        db.session.add(ticket)
        db.session.commit()

        flash('Ticket created successfully!', 'success')
        # Email notification placeholder
        print(f"EMAIL NOTIFICATION: New ticket created by {current_user.username}: {subject}")
        return redirect(url_for('user_dashboard'))

    categories = Category.query.all()
    return render_template('tickets/create_ticket.html', categories=categories)

@app.route('/ticket/<int:ticket_id>')
@login_required
def ticket_detail(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)

    # Ensure only owner, agent, or admin can view
    if current_user.id != ticket.user_id and current_user.role not in ['support_agent', 'admin']:
        flash('You do not have permission to view this ticket.', 'danger')
        return redirect(url_for('index'))

    comments = Comment.query.filter_by(ticket_id=ticket.id).order_by(Comment.created_at.asc()).all()
    return render_template('tickets/ticket_detail.html', ticket=ticket, comments=comments)

@app.route('/ticket/<int:ticket_id>/comment', methods=['POST'])
@login_required
def add_comment(ticket_id):
    ticket = Ticket.query.get_or_404(ticket_id)
    comment_text = request.form['comment_text']

    # Allow owner, agent, or admin to comment
    if current_user.id != ticket.user_id and current_user.role not in ['support_agent', 'admin']:
        flash('You do not have permission to comment on this ticket.', 'danger')
        return redirect(url_for('ticket_detail', ticket_id=ticket.id))

    if not comment_text:
        flash('Comment cannot be empty.', 'danger')
        return redirect(url_for('ticket_detail', ticket_id=ticket.id))

    comment = Comment(
        ticket_id=ticket.id,
        user_id=current_user.id,
        comment_text=comment_text
    )
    db.session.add(comment)
    # Update ticket's updated_at to reflect new activity
    ticket.updated_at = datetime.datetime.now()
    db.session.commit()

    flash('Comment added successfully!', 'success')
    return redirect(url_for('ticket_detail', ticket_id=ticket.id))

@app.route('/ticket/<int:ticket_id>/vote/<string:vote_type>', methods=['POST'])
@login_required
def vote_ticket(ticket_id, vote_type):
    ticket = Ticket.query.get_or_404(ticket_id)

    # Only end users can upvote/downvote
    if current_user.role != 'end_user':
        flash('Only end users can vote on tickets.', 'danger')
        return redirect(url_for('ticket_detail', ticket_id=ticket.id))

    # Basic prevention of multiple votes from the same user (for hackathon, just a simple counter)
    # In a real app, you'd track who voted to prevent abuse.
    if vote_type == 'upvote':
        ticket.upvotes += 1
        flash('Ticket upvoted!', 'success')
    elif vote_type == 'downvote':
        ticket.downvotes += 1
        flash('Ticket downvoted!', 'info')
    else:
        flash('Invalid vote type.', 'danger')
        return redirect(url_for('ticket_detail', ticket_id=ticket.id))

    db.session.commit()
    return redirect(url_for('ticket_detail', ticket_id=ticket.id))

# --- Support Agent Routes ---
@app.route('/dashboard/agent')
@login_required
def agent_dashboard():
    if current_user.role != 'support_agent' and current_user.role != 'admin':
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))

    status_filter = request.args.get('status', 'all')
    category_filter = request.args.get('category', 'all')
    assigned_filter = request.args.get('assigned', 'all') # 'all', 'mine', 'unassigned'

    query = Ticket.query

    if status_filter != 'all':
        query = query.filter_by(status=status_filter)
    if category_filter != 'all':
        category = Category.query.filter_by(name=category_filter).first()
        if category:
            query = query.filter_by(category_id=category.id)
    if assigned_filter == 'mine':
        query = query.filter(Ticket.comments.any(user_id=current_user.id)) # Simplified, implies agent has commented
        # A more robust assignment would involve an 'assigned_agent_id' column on Ticket
    elif assigned_filter == 'unassigned':
        # This is tricky without a dedicated 'assigned_agent_id' column.
        # For now, we'll assume unassigned means no agent has commented.
        # This is a simplification for a hackathon.
        query = query.filter(~Ticket.comments.any(Comment.comment_author.has(role='support_agent')))


    tickets = query.order_by(Ticket.updated_at.desc()).all()
    categories = Category.query.all()
    agents = User.query.filter_by(role='support_agent').all() # For potential future "assign" feature

    return render_template('agent/agent_dashboard.html', tickets=tickets, categories=categories, agents=agents,
                           selected_status=status_filter, selected_category=category_filter, selected_assigned=assigned_filter)

@app.route('/ticket/<int:ticket_id>/update_status', methods=['POST'])
@login_required
def update_ticket_status(ticket_id):
    if current_user.role not in ['support_agent', 'admin']:
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))

    ticket = Ticket.query.get_or_404(ticket_id)
    new_status = request.form['new_status']

    valid_statuses = ['Open', 'In Progress', 'Resolved', 'Closed']
    if new_status not in valid_statuses:
        flash('Invalid status.', 'danger')
        return redirect(url_for('ticket_detail', ticket_id=ticket.id))

    ticket.status = new_status
    ticket.updated_at = datetime.datetime.now() # Manually update for status changes
    db.session.commit()
    flash(f'Ticket status updated to {new_status}!', 'success')
    # Email notification placeholder
    print(f"EMAIL NOTIFICATION: Ticket #{ticket.id} status changed to {new_status}")
    return redirect(url_for('ticket_detail', ticket_id=ticket.id))

# --- Admin Routes ---
@app.route('/dashboard/admin')
@login_required
def admin_dashboard():
    if current_user.role != 'admin':
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))
    users = User.query.all()
    categories = Category.query.all()
    return render_template('admin/admin_dashboard.html', users=users, categories=categories)

@app.route('/admin/users')
@login_required
def manage_users():
    if current_user.role != 'admin':
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))
    users = User.query.all()
    return render_template('admin/user_management.html', users=users)

@app.route('/admin/user/<int:user_id>/update_role', methods=['POST'])
@login_required
def update_user_role(user_id):
    if current_user.role != 'admin':
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))
    user = User.query.get_or_404(user_id)
    new_role = request.form['new_role']
    valid_roles = ['end_user', 'support_agent', 'admin']
    if new_role not in valid_roles:
        flash('Invalid role.', 'danger')
        return redirect(url_for('manage_users'))
    user.role = new_role
    db.session.commit()
    flash(f'User {user.username} role updated to {new_role}.', 'success')
    return redirect(url_for('manage_users'))

@app.route('/admin/categories')
@login_required
def manage_categories():
    if current_user.role != 'admin':
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))
    categories = Category.query.all()
    return render_template('admin/category_management.html', categories=categories)

@app.route('/admin/category/add', methods=['POST'])
@login_required
def add_category():
    if current_user.role != 'admin':
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))
    category_name = request.form['category_name']
    if not category_name:
        flash('Category name cannot be empty.', 'danger')
        return redirect(url_for('manage_categories'))
    existing_category = Category.query.filter_by(name=category_name).first()
    if existing_category:
        flash('Category already exists.', 'danger')
        return redirect(url_for('manage_categories'))
    new_category = Category(name=category_name)
    db.session.add(new_category)
    db.session.commit()
    flash(f'Category "{category_name}" added.', 'success')
    return redirect(url_for('manage_categories'))

@app.route('/admin/category/<int:category_id>/delete', methods=['POST'])
@login_required
def delete_category(category_id):
    if current_user.role != 'admin':
        flash('Unauthorized access.', 'danger')
        return redirect(url_for('index'))
    category = Category.query.get_or_404(category_id)
    # Check if there are tickets linked to this category before deleting (optional but good practice)
    if category.tickets:
        flash('Cannot delete category with associated tickets.', 'danger')
        return redirect(url_for('manage_categories'))
    db.session.delete(category)
    db.session.commit()
    flash(f'Category "{category.name}" deleted.', 'success')
    return redirect(url_for('manage_categories'))


# --- Database Initialization (Logic moved directly into startup) ---

if __name__ == '__main__':
    with app.app_context():
        db.create_all() # Ensure tables are created on run

        # Optional: Create a default admin user and some categories if they don't exist
        # This code will now run once when the app starts if the DB is empty.
        if not User.query.filter_by(username='admin').first():
            admin_user = User(username='admin', email='admin@quickdesk.com', role='admin')
            admin_user.set_password('adminpass') # **CHANGE THIS PASSWORD**
            db.session.add(admin_user)
            db.session.commit()
            print("Default admin user created: admin/adminpass")

        if not Category.query.first():
            default_categories = ['Technical Issue', 'Billing Query', 'Feature Request', 'General Support']
            for cat_name in default_categories:
                db.session.add(Category(name=cat_name))
            db.session.commit()
            print("Default categories created.")

    app.run(debug=True) # Set debug=False in production