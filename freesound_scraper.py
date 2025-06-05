import requests
from bs4 import BeautifulSoup  # 导入 BeautifulSoup

cookies = {
    'PHPSESSID': 'bqgevl5krp4e97q5voa54iu3td',
    'Hm_lvt_8c10b858be2669ba7d233a0babdcd8b6': '1744173025',
    'HMACCOUNT': 'C13FC3587B3E30E6',
    'Hm_lpvt_8c10b858be2669ba7d233a0babdcd8b6': '1744183879',
}

headers = {
    'accept': 'text/html, */*; q=0.01',
    'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-TW;q=0.6',
    'priority': 'u=1, i',
    'referer': 'https://www.tosound.com/search/word-%E6%89%93%E7%81%AB%E6%9C%BA',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'x-requested-with': 'XMLHttpRequest',
}

urls = []


def extract_urls(i):
    import requests
    from bs4 import BeautifulSoup

    # 目标 URL
    url = "https://freesound.org/search/?q=lighter&page=" + str(i)

    # 设置请求头，模拟浏览器访问，有些网站会检查 User-Agent
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        print(f"正在请求 URL: {url}")
        # 发送 GET 请求
        response = requests.get(url, headers=headers, timeout=15)  # 设置超时时间
        response.raise_for_status()  # 检查请求是否成功 (状态码 2xx)

        print("请求成功，正在解析 HTML...")
        # 使用 BeautifulSoup 解析 HTML 内容
        soup = BeautifulSoup(response.text, 'html.parser')

        # 查找所有包含 data-mp3 属性的元素
        # Freesound 页面上，这个属性通常在 <a> 标签内，且 class 可能包含 'mp3_file'
        # 使用 CSS 选择器 '[data-mp3]' 可以查找所有带有该属性的元素
        # 或者更精确地使用 'a[data-mp3]' 查找带有该属性的 <a> 标签
        elements_with_mp3 = soup.select('[data-mp3]')
        # elements_with_mp3 = soup.find_all(attrs={"data-mp3": True}) # 另一种查找方法

        print("\n提取到的 data-mp3 链接:")
        extracted_urls = []
        if elements_with_mp3:
            for element in elements_with_mp3:
                # 获取 data-mp3 属性的值
                mp3_url = element.get('data-mp3')
                if mp3_url:  # 确保链接不为空
                    print(mp3_url)
                    urls.append(mp3_url)
                    extracted_urls.append(mp3_url)
            # print(f"\n总共提取到 {len(extracted_urls)} 个链接。")
        else:
            print("在页面中未找到包含 data-mp3 属性的元素。")

    except requests.exceptions.Timeout:
        print(f"请求超时: {url}")
    except requests.exceptions.RequestException as e:
        print(f"请求 URL 时发生错误: {e}")
    except Exception as e:
        print(f"处理过程中发生其他错误: {e}")


def download_audio(url, output_path):
    print(f"Downloading {url} to {output_path}")
    response = requests.get(url)
    with open(output_path, "wb") as f:
        f.write(response.content)


for i in range(20, 50):
    extract_urls(i)

a = 286
for url in urls:
    download_audio(url, "%s.mp3" % a)
    a += 1

# 爬取后，在linux运行，转换成wav
# for file in *.mp3; do
# ffmpeg -i "$file" "${file%.mp3}.wav"
# done
