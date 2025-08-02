# users, {id,username,role[default=user],is_admin[default=0],category_id}
#categories {id, name}
#tickets {id,status[default=open],category.id,subject,initial_data,vote[default=0]}
#tickets_replies {id,ticket.id,data,user.id,votes[default=0]}
#messages {id,user.id,data}
from flask_login import UserMixin
from datetime import datetime
from . import db, bcrypt


class User(db.Model,UserMixin):
    __tablename__='User'
    id=db.Column(db.Integer,primary_key=True,autoincrement=True)
    username=db.Column(db.String,unique=True,nullable=False)
    password=db.Column(db.String,nullable=False)
    role=db.Column(db.String,nullable=False,default='User')
    category=db.Column(db.Integer,nullable=False,db.ForeignKey('Category.id'))
class Category(db.Model):
    __tablename__='Category'
    id=db.Column(db.Integer,primary_key=True,autoincrement=True)
    name=db.Column(db.String,nullable=False,unique=True)
class Tickets(db.Model):
    __tablename__='Tickets'
    id=db.Column(db.Integer,Primary_key=True,autoincrement=True)
    status=db.Column(db.String,nullable=False,default='Open')
    category=db.Column(db.String,nullable=False,db.ForeignKey('Category.name'))
    subject=db.Column(db.String,nullable=False)
    data=db.Column(db.String,nullable=False)
    vote=db.Column(db.Integer,default=0)
class Ticket_reply(db.Model):
    __tablename__='Ticket_reply'
    