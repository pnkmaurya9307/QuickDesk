from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_required, current_user
from .models import User, ParkingLot, ParkingSpot, Reservation
from . import db
from datetime import datetime
from sqlalchemy import func
from functools import wraps
from datetime import datetime, timezone, timedelta

bp = Blueprint('main', __name__)
IST = timezone(timedelta(hours=5, minutes=30))

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_admin:
            flash('Admin access is required for this page.', 'danger')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)

    return decorated_function
@bp.route('/',methods=['GET',"POST"])
def index():
    if request.method=='GET':
        return render_template(index.html)
    