import sys
import os
import json
from flask import Flask, render_template, request, jsonify

# 添加项目根目录到系统路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.database.models import add_user_input, update_user_input, get_all_records

# 初始化Flask应用
app = Flask(__name__)

@app.route('/')
def index():
    """首页路由，返回Vue.js SPA页面"""
    return render_template('index.html')

@app.route('/api/records')
def get_records():
    """获取所有记录的API"""
    try:
        records = get_all_records()
        return jsonify(records)
    except Exception as e:
        app.logger.error(f"获取记录失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'error': f'获取记录失败: {str(e)}'
        }), 500

@app.route('/api/input', methods=['POST'])
def create_input():
    """创建新的用户输入"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'error': '无效的JSON数据'}), 400
            
        content = data.get('content')
        if not content or not content.strip():
            return jsonify({'status': 'error', 'error': '内容不能为空'}), 400
        
        input_id = add_user_input(content.strip())
        if input_id:
            return jsonify({'status': 'success', 'id': input_id})
        else:
            return jsonify({'status': 'error', 'error': '添加失败'}), 500
    except Exception as e:
        app.logger.error(f"创建输入失败: {str(e)}")
        return jsonify({'status': 'error', 'error': f'服务器错误: {str(e)}'}), 500

@app.route('/api/input/<int:input_id>', methods=['PUT'])
def update_input(input_id):
    """更新用户输入"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'error': '无效的JSON数据'}), 400
            
        content = data.get('content')
        if not content or not content.strip():
            return jsonify({'status': 'error', 'error': '内容不能为空'}), 400
        
        success = update_user_input(input_id, content.strip())
        if success:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'status': 'error', 'error': f'更新输入ID {input_id} 失败'}), 404
    except Exception as e:
        app.logger.error(f"更新输入失败: {str(e)}")
        return jsonify({'status': 'error', 'error': f'服务器错误: {str(e)}'}), 500

# 健康检查API
@app.route('/api/health')
def health_check():
    """健康检查API，用于监控应用状态"""
    return jsonify({
        'status': 'ok',
        'version': '1.0.0'
    })

# 仅在直接运行此文件时执行以下代码
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=3333) 