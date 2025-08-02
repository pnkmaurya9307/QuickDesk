from flask_login import UserMixin
from datetime import datetime
from . import db, bcrypt


class Category(db.Model):
    __tablename__='Category'
    id=db.Column(db.Integer,primary_key=True)
    name=db.Column(db.String,nullable=False,unique=True)
class User(db.Model,UserMixin):
    __tablename__='User'
    id=db.Column(db.Integer,primary_key=True)
    username=db.Column(db.String,unique=True,nullable=False)
    password=db.Column(db.String,nullable=False)
    role=db.Column(db.String,nullable=False,default='User')
    category=db.Column(db.Integer,db.ForeignKey(Category.id),nullable=False)

class Tickets(db.Model):
    __tablename__='Tickets'
    id=db.Column(db.Integer,Primary_key=True)
    status=db.Column(db.String,nullable=False,default='Open')
    category=db.Column(db.String,db.ForeignKey(Category.id),nullable=False)
    subject=db.Column(db.String,nullable=False)
    data=db.Column(db.String,nullable=False)
    vote=db.Column(db.Integer,default=0)
class Ticket_reply(db.Model):
    __tablename__='Ticket_reply'
    prev_id=db.Column(db.Integer,nullable=False)
    id=db.Column(db.Integer,primary_key=True)
    data=db.Column(db.String,nullable=False)
    user=db.column(db.Integer,db.ForeignKey(User.id))
    votes=db.Column(db.Integer,default=0)
class Messages(db.Model):
    __tablename__='Messages'
    id=db.Column(db.Integer,primary_key=True)
    data=db.Column(db.String,nullable=False)
    user=db.Column(db.Integer,db.ForeignKey(User.id),nullable=False)

