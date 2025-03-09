import sqlite3
import datetime
import json
import os
from pathlib import Path

# 确保数据库目录存在
DB_DIR = Path(__file__).parent
DB_DIR.mkdir(exist_ok=True)
DATABASE_PATH = DB_DIR / 'ailian.db'

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(str(DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """初始化数据库表结构"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 创建用户输入表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_inputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'pending'
    )
    ''')
    
    # 创建模型响应表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS model_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        input_id INTEGER NOT NULL,
        thinking_process TEXT,
        result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'processing',
        FOREIGN KEY (input_id) REFERENCES user_inputs (id)
    )
    ''')
    
    conn.commit()
    conn.close()
    
    print(f"数据库初始化完成: {DATABASE_PATH}")

def add_user_input(content):
    """添加用户输入"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.datetime.now().isoformat()
    cursor.execute(
        'INSERT INTO user_inputs (content, created_at, updated_at) VALUES (?, ?, ?)',
        (content, now, now)
    )
    input_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    return input_id

def update_user_input(input_id, content):
    """更新用户输入"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.datetime.now().isoformat()
    cursor.execute(
        'UPDATE user_inputs SET content = ?, updated_at = ?, status = ? WHERE id = ?',
        (content, now, 'pending', input_id)
    )
    
    conn.commit()
    conn.close()
    
    # 删除与此输入相关的响应，以便重新生成
    delete_responses_for_input(input_id)

def delete_responses_for_input(input_id):
    """删除与特定输入相关的所有响应"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        'DELETE FROM model_responses WHERE input_id = ?',
        (input_id,)
    )
    
    conn.commit()
    conn.close()
    
    print(f"已删除输入 ID: {input_id} 的所有响应，准备重新处理")

def create_model_response(input_id):
    """创建模型响应记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.datetime.now().isoformat()
    cursor.execute(
        'INSERT INTO model_responses (input_id, created_at, updated_at) VALUES (?, ?, ?)',
        (input_id, now, now)
    )
    response_id = cursor.lastrowid
    
    conn.commit()
    conn.close()
    
    return response_id

def update_model_thinking(response_id, thinking_process):
    """更新模型思考过程"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.datetime.now().isoformat()
    cursor.execute(
        'UPDATE model_responses SET thinking_process = ?, updated_at = ? WHERE id = ?',
        (thinking_process, now, response_id)
    )
    
    conn.commit()
    conn.close()

def update_model_result(response_id, result):
    """更新模型思考结果"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    now = datetime.datetime.now().isoformat()
    cursor.execute(
        'UPDATE model_responses SET result = ?, updated_at = ?, status = ? WHERE id = ?',
        (result, now, 'completed', response_id)
    )
    
    # 同时更新用户输入状态
    cursor.execute(
        '''UPDATE user_inputs SET status = 'processed' 
           WHERE id = (SELECT input_id FROM model_responses WHERE id = ?)''',
        (response_id,)
    )
    
    conn.commit()
    conn.close()

def get_all_records():
    """获取所有记录"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT 
        ui.id, ui.content, ui.created_at, ui.updated_at, ui.status as input_status,
        mr.id as response_id, mr.thinking_process, mr.result, mr.status as response_status,
        mr.created_at as response_created_at, mr.updated_at as response_updated_at
    FROM user_inputs ui
    LEFT JOIN model_responses mr ON ui.id = mr.input_id
    ORDER BY ui.created_at DESC
    ''')
    
    records = cursor.fetchall()
    
    conn.close()
    
    return [dict(record) for record in records]

def get_pending_inputs():
    """获取待处理的用户输入"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
    SELECT id, content 
    FROM user_inputs 
    WHERE status = 'pending'
    ''')
    
    pending_inputs = cursor.fetchall()
    
    conn.close()
    
    return [dict(input) for input in pending_inputs]

# 初始化数据库
if not DATABASE_PATH.exists():
    init_db() 