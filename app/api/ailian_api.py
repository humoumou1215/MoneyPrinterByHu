import requests
import json
import os
import time
from dotenv import load_dotenv
from openai import OpenAI

# 加载环境变量
load_dotenv()

# 获取API密钥（实际使用时需要配置）
API_KEY = os.getenv("AILIAN_API_KEY", "your_api_key_here")
API_URL = os.getenv("AILIAN_API_URL", "https://api.example.com/ailian")
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")

def call_ailian_api(prompt):
    """
    调用阿里百炼API
    
    Args:
        prompt (str): 用户输入的提示词
        
    Returns:
        tuple: (思考过程, 思考结果)
    """
    try:
        # 检查API密钥是否配置
        if not DASHSCOPE_API_KEY:
            error_msg = "未配置DASHSCOPE_API_KEY环境变量，无法调用阿里百炼API"
            print(error_msg)
            return error_msg, "请在.env文件中配置DASHSCOPE_API_KEY密钥"
            
        # 初始化OpenAI客户端
        client = OpenAI(
            # 如果没有配置环境变量，请用百炼API Key替换：api_key="sk-xxx"
            api_key=DASHSCOPE_API_KEY,
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1"
        )

        reasoning_content = ""  # 定义完整思考过程
        answer_content = ""     # 定义完整回复
        is_answering = False    # 判断是否结束思考过程并开始回复

        # 创建聊天完成请求
        completion = client.chat.completions.create(
            model="qwq-32b",  # 此处以 qwq-32b 为例，可按需更换模型名称
            messages=[
                {"role": "user", "content": prompt}
            ],
            stream=True,
            # 解除以下注释会在最后一个chunk返回Token使用量
            # stream_options={
            #     "include_usage": True
            # }
        )

        print("\n" + "=" * 20 + "思考过程" + "=" * 20 + "\n")

        for chunk in completion:
            # 如果chunk.choices为空，则打印usage
            if not chunk.choices:
                print("\nUsage:")
                print(chunk.usage)
            else:
                delta = chunk.choices[0].delta
                # 处理思考过程
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content is not None:
                    print(delta.reasoning_content, end='', flush=True)
                    reasoning_content += delta.reasoning_content
                else:
                    # 开始回复
                    if hasattr(delta, 'content') and delta.content != "" and is_answering is False:
                        print("\n" + "=" * 20 + "完整回复" + "=" * 20 + "\n")
                        is_answering = True
                    # 打印回复过程
                    if hasattr(delta, 'content') and delta.content is not None:
                        print(delta.content, end='', flush=True)
                        answer_content += delta.content

        return reasoning_content, answer_content
    except Exception as e:
        print(f"百炼API调用异常：{str(e)}")
        return f"API调用异常：{str(e)}", "无法获取结果"

# 模拟API响应（仅用于开发和测试）
def mock_ailian_api(prompt):
    """
    模拟阿里百炼API（用于开发和测试）
    
    Args:
        prompt (str): 用户输入的提示词
        
    Returns:
        tuple: (思考过程, 思考结果)
    """
    # 模拟思考过程
    thinking_process = f"""
1. 首先分析用户输入: "{prompt}"
2. 考虑可能的回答方向
   - 这是一个关于什么的问题？
   - 需要提供什么样的信息？
   - 是否需要进行计算或推理？
3. 构建响应框架
4. 填充具体内容
5. 检查回答的准确性和完整性
    """
    
    # 模拟结果和延迟
    result = "对于\"" + prompt + "\"的回答是：这是一个模拟的回答，实际使用时将由阿里百炼API提供真实的响应。"
    
    # 模拟延迟
    time.sleep(2)
    
    return thinking_process, result 