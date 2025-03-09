import os
import threading
import sys
import signal
import logging
import time

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log")
    ]
)
logger = logging.getLogger("MoneyPrinter")

# 添加当前目录到系统路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(current_dir)
sys.path.insert(0, project_dir)

from app.backend.processor import InputProcessor
from app.frontend.app import app as flask_app
from app.database.models import init_db

# 设置端口号（避免与macOS AirPlay冲突）
PORT = 3333

# 全局变量，存储处理器以便在任何地方都能访问
processor = None

def signal_handler(sig, frame):
    """处理信号，确保程序能够优雅退出"""
    logger.info("接收到终止信号，正在关闭应用...")
    
    if processor:
        processor.stop()
        
    # 给处理器一些时间完成当前任务
    time.sleep(1)
    logger.info("应用已关闭")
    sys.exit(0)

def start_backend_processor():
    """启动后台处理器"""
    global processor
    processor = InputProcessor(polling_interval=5)
    processor.start()
    return processor

def start_frontend_server():
    """启动前端服务器"""
    logger.info(f"前端服务器运行在 http://localhost:{PORT}")
    flask_app.run(debug=False, host='0.0.0.0', port=PORT)

def check_environment():
    """检查运行环境是否满足要求"""
    # 检查数据库目录
    db_dir = os.path.join(current_dir, 'database')
    if not os.path.exists(db_dir):
        logger.warning(f"数据库目录不存在: {db_dir}，将创建")
        os.makedirs(db_dir)
    
    # 检查前端模板目录
    templates_dir = os.path.join(current_dir, 'frontend', 'templates')
    if not os.path.exists(templates_dir):
        logger.warning(f"模板目录不存在: {templates_dir}，将创建")
        os.makedirs(templates_dir)
    
    # 检查前端静态文件目录
    static_dir = os.path.join(current_dir, 'frontend', 'static')
    if not os.path.exists(static_dir):
        logger.warning(f"静态文件目录不存在: {static_dir}，将创建")
        os.makedirs(static_dir)
    
    return True

if __name__ == "__main__":
    # 注册信号处理
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # 检查环境
    check_environment()
    
    # 初始化数据库
    logger.info("初始化数据库...")
    init_db()
    
    # 启动后台处理器
    logger.info("启动后台处理器...")
    processor = start_backend_processor()
    
    try:
        # 在主线程中启动前端服务器
        logger.info("启动阿里百炼大模型思考记录应用...")
        start_frontend_server()
    except Exception as e:
        logger.error(f"应用启动失败: {str(e)}")
        if processor:
            processor.stop()
        sys.exit(1) 