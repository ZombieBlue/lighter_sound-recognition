# 数据处理

安装库: pip install librosa numpy soundfile tqdm

创建 data/lighter 和 data/background 文件夹并放入 .wav 文件（使用爬虫已获取）。

运行: python preprocess_data.py

会在 processed_data 文件夹下生成 features.npy 和 labels.npy。


# 模型训练
运行:

安装库: pip install tensorflow scikit-learn

确保 processed_data 文件夹下有 .npy 文件。


运行: python train_model.py

模型将被保存为 lighter_detector_model.h5。


# 后端服务

安装库: pip install sounddevice requests tensorflow

确保模型文件 lighter_detector_model.h5 存在。

先不要运行，因为 Web 后端还没启动。

运行:

安装库: pip install Flask

创建数据库和表: 第一次运行时，init_db() 会自动创建 events.db 文件。

运行: python app.py

Flask 服务器将在 http://localhost:5000 (或 http://<你的IP地址>:5000) 启动。



# 启动

运行后端: python app.py

运行实时检测器: 

## 运行在仓库（高风险区域）
python real_time_detector.py --location "仓库" --risk-level "high"

## 运行在厕所（低风险区域）
python real_time_detector.py --location "厕所" --risk-level "low"

## 运行在试衣间（中风险区域）
python real_time_detector.py --location "试衣间" --risk-level "medium"

运行前端：

cd vue-app
npm install
npm run serve

运行小程序：

使用微信开发者工具，导入'小程序' 项目即可，***注意***：小程序由于要访问本地的python后端，需要保持在同一个网络下，详见小程序README.md


# 测试:

打开网页 (http://localhost:5173/)。

在运行 real_time_detector.py 的电脑麦克风附近打响打火机。

观察 real_time_detector.py 的控制台输出，看是否有 "DETECTED" 消息和 "Event sent to backend" 消息。

观察网页，新的事件应该会在几秒内出现在表格中（取决于刷新间隔）， 
第二个菜单会对检测到的数据进行分析。
第三个菜单为巡检员使用的菜单，点击开始监控，就是会实时监听高危事件


