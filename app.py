from flask import Flask, redirect, render_template, url_for, jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_limiter.errors import RateLimitExceeded
from pymongo import MongoClient
import os
from bson.json_util import dumps
from dotenv import load_dotenv
from uuid import uuid4
from waitress import serve

load_dotenv()

mongoapp = MongoClient(os.environ.get("mongodb"))
database = mongoapp["geolocation"]
collection = database["records"]
blacklist_collection = database["blacklist"]

app = Flask(__name__)
limiter = Limiter(
    get_remote_address,
    app=app,
    storage_uri=os.environ.get("mongodb"),
    default_limits=["5040 per day", "360 per hour"]  # Example default limits
)

@app.errorhandler(RateLimitExceeded)
def handle_rate_limit_exceeded(e):
    ip = request.headers.get('X-Forwarded-For', '').split(',')[0] or request.remote_addr
    print(f"Rate limit exceeded for IP: {ip}")
    block_ip(ip)
    return f"IP {ip} blacklisted due to forbidden request", 429

@app.route('/rate_limit_exceeded')
def rate_limit_exceeded():
    ip = request.headers.get('X-Forwarded-For', '').split(',')[0] or request.remote_addr
    return f"IP {ip} blacklisted due to forbidden request", 429

@app.before_request
def check_blacklist():
    ip = request.headers.get('X-Forwarded-For', '').split(',')[0] or request.remote_addr
    if is_ip_blacklisted(ip):
        return f"IP {ip} blacklisted due to forbidden request", 403

@app.route("/")
def index():
    ip = request.headers.get('X-Forwarded-For', '').split(',')[0] or request.remote_addr
    if is_ip_blacklisted(ip):
        return f"IP {ip} blacklisted due to forbidden request", 403
    return render_template("index.html", map = os.getenv("map") or "no map")

@app.route("/static/index.html")
def static_index():
    return redirect(url_for('index'))

@app.route('/api/data', methods=['POST'])
@limiter.limit("60 per 1 seconds")
def receive_data():
    ip = request.headers.get('X-Forwarded-For', '').split(',')[0] or request.remote_addr
    if is_ip_blacklisted(ip):
        return f"IP {ip} blacklisted due to forbidden request", 403
    
    data = request.json
    user_session = data.get("userSession")

    if not user_session:
        return "Missing userSession", 400

    # Check if the userSession already exists in the collection
    existing_record = collection.find_one({"userSession": user_session})

    if existing_record:
        # Update the existing record
        collection.update_one(
            {"userSession": user_session},
            {"$set": data}
        )
        return jsonify({"message": "Record updated", "data": data})

    else:
        # Create a new record
        collection.insert_one(data)
        return jsonify({"message": "Record created", "data": data})

def is_ip_blacklisted(ip):
    return blacklist_collection.find_one({"ip": ip}) is not None

def block_ip(ip):
    if not is_ip_blacklisted(ip):
        blacklist_collection.insert_one({"ip": ip})

if __name__ == "__main__":
    print("server running...")
    serve(app, host='0.0.0.0', port=5000, threads=8)
