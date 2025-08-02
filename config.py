import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a_very_secret_key_for_development')

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
                              'sqlite:///' + os.path.join(basedir, 'instance', 'app.db')

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    INSTANCE_FOLDER_PATH = os.path.join(basedir, 'instance')
    if not os.path.exists(INSTANCE_FOLDER_PATH):
        os.makedirs(INSTANCE_FOLDER_PATH)