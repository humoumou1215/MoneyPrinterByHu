import time
import threading
import sys
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 添加项目根目录到系统路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from app.database.models import get_pending_inputs, create_model_response, update_model_thinking, update_model_result
from app.api.ailian_api import call_ailian_api, mock_ailian_api

# 配置是否使用模拟API
USE_MOCK_API = os.getenv("USE_MOCK_API", "True").lower() in ('true', '1', 't')

class InputProcessor:
    """用户输入处理器"""
    
    def __init__(self, polling_interval=5):
        """
        初始化处理器
        
        Args:
            polling_interval (int): 轮询间隔（秒）
        """
        self.polling_interval = polling_interval
        self.running = False
        self.thread = None
    
    def start(self):
        """启动处理器"""
        if self.running:
            print("处理器已在运行")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._process_loop)
        self.thread.daemon = True
        self.thread.start()
        print("处理器已启动")
    
    def stop(self):
        """停止处理器"""
        self.running = False
        if self.thread:
            self.thread.join()
            print("处理器已停止")
    
    def _process_loop(self):
        """处理循环"""
        while self.running:
            try:
                # 获取待处理的输入
                pending_inputs = get_pending_inputs()
                
                for input_data in pending_inputs:
                    input_id = input_data['id']
                    content = input_data['content']
                    
                    # 创建模型响应记录
                    response_id = create_model_response(input_id)
                    
                    # 调用API（或模拟API）
                    if USE_MOCK_API:
                        thinking_process, result = mock_ailian_api(content)
                    else:
                        thinking_process, result = call_ailian_api(content)
                    
                    # 更新思考过程
                    update_model_thinking(response_id, thinking_process)
                    
                    # 更新思考结果
                    update_model_result(response_id, result)
                    
                    print(f"已处理用户输入 ID: {input_id}")
                
                # 等待下一个轮询周期
                time.sleep(self.polling_interval)
                
            except Exception as e:
                print(f"处理循环异常: {str(e)}")
                time.sleep(self.polling_interval)  # 发生异常时继续等待

# 用于直接运行此脚本
if __name__ == "__main__":
    processor = InputProcessor(polling_interval=5)
    
    try:
        processor.start()
        
        # 保持主线程运行
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("正在停止处理器...")
        processor.stop()
        print("处理器已终止") 