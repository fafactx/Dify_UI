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

        # 发送到后端服务 (使用主机 IP 地址)
        response = requests.post(
            "http://10.193.21.115:3000/api/save-evaluation",
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
