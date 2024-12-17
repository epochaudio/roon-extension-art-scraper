# Roon Art Scraper

一个用于批量下载Roon音乐库中艺术家图片和专辑封面的Docker扩展程序。

 
Roon Art Scraper是一个Roon扩展程序，需要通过Roon的界面来触发下载。以下是使用步骤：
1. 首先确保Roon Core（Roon核心服务）正在运行
启动容器后，在Roon设置中启用扩展：
打开Roon
进入Settings（设置）
选择Extensions（扩展）
找到"Art Scraper"并启用它
触发下载：
启用扩展后，在Extensions设置页面中找到"Art Scraper"
你会看到一个下拉菜单，可以选择：
Artists：下载艺术家图片
Albums：下载专辑封面
选择后，程序会自动开始扫描并下载图片：
图片会保存在 ./art/Artists 或 ./art/Albums 目录下
进度会在Roon的Extensions页面显示
下载完成后会显示"Scraping done!"的提示



## 使用方法

1. 确保Roon Core正在运行

2. 在Roon中启用扩展：
   - 打开Roon
   - 进入Settings（设置）
   - 选择Extensions（扩展）
   - 找到并启用"Art Scraper"

3. 下载图片：
   - 在Extensions中点击"Art Scraper"
   - 从下拉菜单选择要下载的内容：
     - Artists：下载艺术家图片
     - Albums：下载专辑封面
   - 等待下载完成

4. 下载的图片将保存在：
   - 艺术家图片：`./art/Artists/`
   - 专辑封面：`./art/Albums/`

## 注意事项

- 需要保持Roon Core和本扩展程序在同一网络中
- 下载过程中可以在Roon的Extensions页面查看进度
- 图片将按照艺术家名称或专辑名称命名