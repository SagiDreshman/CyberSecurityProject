from app.database import engine, Base
from app import models


def run():
    Base.metadata.create_all(bind=engine)
    print("Tables created ✅")

if __name__ == "__main__":
    run()
