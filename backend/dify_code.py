import requests
import json

def main(arg1: dict) -> dict:
    """
    将评估结果发送到可视化后端服务

    参数:
        arg1: 包含评估结果的对象，格式为 {"arg1": {"result0": {...}, "result1": {...}}}

    返回:
        包含操作结果的字典
    """
    try:
        # 检查数据格式并提取评估结果
        if isinstance(arg1, dict) and "arg1" in arg1:
            # 新格式：提取 arg1 字段中的数据
            evaluation_data = arg1["arg1"]
            print(f"检测到新数据格式，提取 arg1 字段中的数据: {json.dumps(evaluation_data)[:100]}...")
        else:
            # 旧格式：直接使用 arg1
            evaluation_data = arg1
            print(f"使用旧数据格式: {json.dumps(evaluation_data)[:100]}...")

        # 后端服务URL (可根据实际部署环境修改)
        # 注意: 在实际部署时，请将此URL替换为您的后端服务地址
        backend_url = "http://localhost:3000"  # 默认本地开发环境

        # 如果需要在环境变量中配置
        import os
        if "DIFY_BACKEND_URL" in os.environ:
            backend_url = os.environ["DIFY_BACKEND_URL"]

        # 发送到后端服务
        response = requests.post(
            f"{backend_url}/api/save-evaluation",
            headers={"Content-Type": "application/json"},
            data=json.dumps(evaluation_data)
        )

        # 检查响应
        if response.status_code == 200:
            result = response.json()
            return {
                "result": {
                    "success": True,
                    "message": "评估数据已成功发送到可视化服务",
                    "details": result
                }
            }
        else:
            return {
                "result": {
                    "success": False,
                    "message": f"发送数据失败: HTTP {response.status_code}",
                    "details": response.text
                }
            }
    except Exception as e:
        return {
            "result": {
                "success": False,
                "message": f"处理评估数据时出错: {str(e)}"
            }
        }
