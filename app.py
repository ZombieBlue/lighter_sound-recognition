from flask import Flask, request, jsonify, render_template, session
import sqlite3
import time
import os
import hashlib
import secrets

DATABASE = 'events.db'
TABLE_NAME = 'detections'
USER_TABLE = 'users'  # 新增用户表
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, DATABASE)

app = Flask(__name__, template_folder='templates')  # Tell Flask where templates are
app.secret_key = secrets.token_hex(16)  # 设置session密钥


# --- Database Setup ---
def get_db():
    """Connects to the specific database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionary-like objects
    return conn


def init_db():
    """Initializes the database schema."""
    print(f"Initializing database at: {DB_PATH}")
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute(f'''
            CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL NOT NULL,
                confidence REAL NOT NULL,
                device_id TEXT,
                location TEXT,
                risk_level TEXT,
                handled INTEGER DEFAULT 0
            )
        ''')
        
        # 创建用户表
        cursor.execute(f'''
            CREATE TABLE IF NOT EXISTS {USER_TABLE} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,  # 'user' 或 'inspector'
                created_at REAL NOT NULL
            )
        ''')
        
        db.commit()
        print("Database tables created or already exist.")
    except sqlite3.Error as e:
        print(f"Database error during initialization: {e}")
    finally:
        if db:
            db.close()


# --- 用户认证相关函数 ---
def hash_password(password):
    """对密码进行哈希处理"""
    return hashlib.sha256(password.encode()).hexdigest()


# --- 用户管理API ---
@app.route('/api/register', methods=['POST'])
def register():
    """用户注册接口"""
    if not request.is_json:
        return jsonify({"error": "请求必须是JSON格式"}), 400
        
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    
    # 验证必填字段
    if not all([username, password, role]):
        return jsonify({"error": "用户名、密码和角色都是必填项"}), 400
        
    # 验证角色值
    if role not in ['user', 'inspector']:
        return jsonify({"error": "角色必须是'user'或'inspector'"}), 400
    
    # 哈希处理密码
    hashed_password = hash_password(password)
    
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查用户名是否已存在
        cursor.execute(f'SELECT id FROM {USER_TABLE} WHERE username = ?', (username,))
        if cursor.fetchone():
            return jsonify({"error": "用户名已存在"}), 409
            
        # 插入新用户
        current_time = time.time()
        cursor.execute(
            f'INSERT INTO {USER_TABLE} (username, password, role, created_at) VALUES (?, ?, ?, ?)',
            (username, hashed_password, role, current_time)
        )
        conn.commit()
        
        return jsonify({
            "message": "注册成功",
            "username": username,
            "role": role
        }), 201
    except sqlite3.Error as e:
        print(f"数据库错误: {e}")
        if conn:
            conn.rollback()
        return jsonify({"error": "数据库错误"}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/login', methods=['POST'])
def login():
    """用户登录接口"""
    if not request.is_json:
        return jsonify({"error": "请求必须是JSON格式"}), 400
        
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({"error": "用户名和密码都是必填项"}), 400
    
    # 哈希处理密码
    hashed_password = hash_password(password)
    
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 查询用户
        cursor.execute(
            f'SELECT id, username, role FROM {USER_TABLE} WHERE username = ? AND password = ?',
            (username, hashed_password)
        )
        user = cursor.fetchone()
        
        if not user:
            return jsonify({"error": "用户名或密码错误"}), 401
            
        # 设置会话
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role'] = user['role']
        
        return jsonify({
            "message": "登录成功",
            "username": user['username'],
            "role": user['role']
        }), 200
    except sqlite3.Error as e:
        print(f"数据库错误: {e}")
        return jsonify({"error": "数据库错误"}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/logout', methods=['POST'])
def logout():
    """用户退出登录接口"""
    # 清除会话数据
    session.clear()
    return jsonify({"message": "退出登录成功"}), 200


@app.route('/api/user/current', methods=['GET'])
def current_user():
    """获取当前登录用户信息"""
    if 'user_id' not in session:
        return jsonify({"error": "未登录"}), 401
        
    return jsonify({
        "user_id": session['user_id'],
        "username": session['username'],
        "role": session['role']
    }), 200


# --- API Endpoints ---
@app.route('/api/events', methods=['POST'])
def receive_event():
    """Receives event data from the detector."""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    timestamp = data.get('timestamp')
    confidence = data.get('confidence')
    device_id = data.get('device_id', 'unknown')  # Optional device ID
    location = data.get('location', 'unknown')  # 新增的检测地点
    risk_level = data.get('risk_level', 'unknown')  # 新增的风险级别

    if timestamp is None or confidence is None:
        return jsonify({"error": "Missing 'timestamp' or 'confidence'"}), 400

    print(f"Received event: Time={timestamp}, Confidence={confidence:.2f}, Device={device_id}, Location={location}, Risk={risk_level}")

    sql = f'INSERT INTO {TABLE_NAME} (timestamp, confidence, device_id, location, risk_level, handled) VALUES (?, ?, ?, ?, ?, 0)'
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(sql, (timestamp, confidence, device_id, location, risk_level))
        conn.commit()
        return jsonify({"message": "Event received successfully"}), 201
    except sqlite3.Error as e:
        print(f"Database error on insert: {e}")
        if conn:
            conn.rollback()  # Rollback transaction on error
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/events', methods=['GET'])
def get_events():
    """Returns recent events from the database."""
    limit = request.args.get('limit', 50, type=int)  # Get limit from query param, default 50
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        # Fetch recent events, newest first
        cursor.execute(f'SELECT id, timestamp, confidence, device_id, location, risk_level, handled FROM {TABLE_NAME} ORDER BY timestamp DESC LIMIT ?',
                       (limit,))
        events = cursor.fetchall()
        # Convert rows to list of dictionaries
        result = [dict(row) for row in events]
        return jsonify(result)
    except sqlite3.Error as e:
        print(f"Database error on fetch: {e}")
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/events/<int:event_id>/handle', methods=['POST'])
def mark_event_handled(event_id):
    """标记事件为已处理"""
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # 检查事件是否存在
        cursor.execute(f'SELECT id FROM {TABLE_NAME} WHERE id = ?', (event_id,))
        event = cursor.fetchone()
        
        if not event:
            return jsonify({"error": "Event not found"}), 404
            
        # 更新事件为已处理
        cursor.execute(f'UPDATE {TABLE_NAME} SET handled = 1 WHERE id = ?', (event_id,))
        conn.commit()
        
        return jsonify({"message": f"Event {event_id} marked as handled"}), 200
    except sqlite3.Error as e:
        print(f"Database error on update: {e}")
        if conn:
            conn.rollback()
        return jsonify({"error": "Database error"}), 500
    finally:
        if conn:
            conn.close()


# --- Frontend Route ---
@app.route('/')
def index():
    """Serves the main HTML page."""
    # Simply render the template file. Data fetching will be done by JS.
    return render_template('index.html')


# --- Main Execution ---
if __name__ == '__main__':
    init_db()  # Ensure database and table exist before starting
    # Use host='0.0.0.0' to make it accessible on your network
    # Use debug=True for development (auto-reloads), remove for production
    app.run(host='0.0.0.0', port=5000, debug=True)
