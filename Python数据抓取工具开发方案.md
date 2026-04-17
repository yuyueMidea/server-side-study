# Python 通用数据抓取工具方案

## 核心方案对比

抓取工具大致分四个层次，按复杂度递增：

**1. 静态页面抓取**（HTML直接返回）
- `requests` + `BeautifulSoup` — 最轻量，适合结构清晰的HTML
- `lxml` — 性能更强，支持XPath，适合大批量解析

**2. 动态页面抓取**（JS渲染）
- `Playwright` — 现代主流，支持异步，可控性强
- `Selenium` — 经典方案，生态成熟但较重
- `Pyppeteer` — Puppeteer的Python移植，较少维护

**3. 异步高并发抓取**
- `aiohttp` + `asyncio` — 适合大规模URL并发
- `Scrapy` — 工业级框架，内置调度、去重、Pipeline

**4. 结构化/AI辅助抓取**
- `Parsel` — Scrapy的选择器独立版
- `trafilatura` — 自动提取正文
- 结合 LLM 做非结构化内容理解

---

## 通用工具架构设计

一份"通用"爬虫工具应包含以下模块：

```
scraper/
├── core/
│   ├── fetcher.py       # 请求层（静态/动态自动切换）
│   ├── parser.py        # 解析层（CSS/XPath/Regex）
│   ├── storage.py       # 存储层（CSV/JSON/DB）
│   └── scheduler.py     # 调度层（队列/并发/去重）
├── middleware/
│   ├── proxy.py         # 代理池
│   ├── retry.py         # 重试策略
│   └── rate_limiter.py  # 频率控制
└── config.py            # 全局配置
```

---

## 完整实现代码

下面是一个可直接运行的通用抓取工具：

### `config.py`

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class ScraperConfig:
    # 请求配置
    timeout: int = 15
    max_retries: int = 3
    delay: float = 1.0          # 请求间隔（秒）
    concurrency: int = 5        # 并发数
    use_browser: bool = False   # 是否启用浏览器渲染

    # Headers
    headers: dict = field(default_factory=lambda: {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
        ),
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    })

    # 代理
    proxies: Optional[dict] = None  # {"http": "...", "https": "..."}

    # 存储
    output_format: str = "json"   # json | csv | sqlite
    output_path: str = "output"
```

---

### `core/fetcher.py` — 请求层（自动切换静态/动态）

```python
import asyncio
import aiohttp
import requests
from typing import Optional
from playwright.async_api import async_playwright

class Fetcher:
    def __init__(self, config):
        self.config = config

    # ── 同步静态抓取 ──────────────────────────────────────
    def fetch_static(self, url: str) -> Optional[str]:
        for attempt in range(self.config.max_retries):
            try:
                resp = requests.get(
                    url,
                    headers=self.config.headers,
                    proxies=self.config.proxies,
                    timeout=self.config.timeout,
                )
                resp.raise_for_status()
                resp.encoding = resp.apparent_encoding
                return resp.text
            except Exception as e:
                print(f"[静态抓取] 第{attempt+1}次失败: {e}")
        return None

    # ── 异步静态抓取（高并发）────────────────────────────
    async def fetch_static_async(
        self, session: aiohttp.ClientSession, url: str
    ) -> Optional[str]:
        for attempt in range(self.config.max_retries):
            try:
                async with session.get(
                    url,
                    headers=self.config.headers,
                    timeout=aiohttp.ClientTimeout(total=self.config.timeout),
                ) as resp:
                    resp.raise_for_status()
                    return await resp.text()
            except Exception as e:
                print(f"[异步抓取] {url} 第{attempt+1}次失败: {e}")
                await asyncio.sleep(1)
        return None

    async def fetch_batch(self, urls: list[str]) -> list[Optional[str]]:
        """并发抓取一批URL"""
        sem = asyncio.Semaphore(self.config.concurrency)
        async with aiohttp.ClientSession() as session:
            async def _limited(url):
                async with sem:
                    await asyncio.sleep(self.config.delay)
                    return await self.fetch_static_async(session, url)
            return await asyncio.gather(*[_limited(u) for u in urls])

    # ── 浏览器动态渲染（Playwright）──────────────────────
    async def fetch_dynamic(self, url: str, wait_selector: str = None) -> Optional[str]:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_extra_http_headers(self.config.headers)
            try:
                await page.goto(url, timeout=self.config.timeout * 1000)
                if wait_selector:
                    await page.wait_for_selector(
                        wait_selector, timeout=self.config.timeout * 1000
                    )
                else:
                    await page.wait_for_load_state("networkidle")
                return await page.content()
            except Exception as e:
                print(f"[动态抓取] 失败: {e}")
                return None
            finally:
                await browser.close()

    def fetch(self, url: str, wait_selector: str = None) -> Optional[str]:
        """统一入口：自动选择静态/动态"""
        if self.config.use_browser:
            return asyncio.run(self.fetch_dynamic(url, wait_selector))
        return self.fetch_static(url)
```

---

### `core/parser.py` — 解析层

```python
import re
from typing import Any, Optional
from bs4 import BeautifulSoup
from lxml import etree

class Parser:
    def __init__(self, html: str):
        self.html = html
        self._soup = None
        self._tree = None

    @property
    def soup(self) -> BeautifulSoup:
        if not self._soup:
            self._soup = BeautifulSoup(self.html, "lxml")
        return self._soup

    @property
    def tree(self):
        if self._tree is None:
            self._tree = etree.HTML(self.html)
        return self._tree

    # ── CSS 选择器 ────────────────────────────────────────
    def css(self, selector: str, attr: str = None) -> list[str]:
        elements = self.soup.select(selector)
        if attr:
            return [el.get(attr, "").strip() for el in elements]
        return [el.get_text(strip=True) for el in elements]

    def css_one(self, selector: str, attr: str = None) -> Optional[str]:
        result = self.css(selector, attr)
        return result[0] if result else None

    # ── XPath ─────────────────────────────────────────────
    def xpath(self, expression: str) -> list[str]:
        results = self.tree.xpath(expression)
        return [r.strip() if isinstance(r, str) else
                etree.tostring(r, method="text", encoding="unicode").strip()
                for r in results]

    def xpath_one(self, expression: str) -> Optional[str]:
        result = self.xpath(expression)
        return result[0] if result else None

    # ── 正则 ──────────────────────────────────────────────
    def regex(self, pattern: str, group: int = 0) -> list[str]:
        return re.findall(pattern, self.html)

    # ── 批量字段提取（Schema驱动）────────────────────────
    def extract(self, schema: dict[str, dict]) -> dict[str, Any]:
        """
        schema示例:
        {
            "title":  {"type": "css",   "rule": "h1.title"},
            "price":  {"type": "xpath", "rule": "//span[@class='price']/text()"},
            "images": {"type": "css",   "rule": "img.product", "attr": "src", "many": True},
            "id":     {"type": "regex", "rule": r'"productId":"(\d+)"'},
        }
        """
        result = {}
        for field, conf in schema.items():
            t = conf["type"]
            rule = conf["rule"]
            many = conf.get("many", False)
            attr = conf.get("attr")
            try:
                if t == "css":
                    result[field] = self.css(rule, attr) if many else self.css_one(rule, attr)
                elif t == "xpath":
                    result[field] = self.xpath(rule) if many else self.xpath_one(rule)
                elif t == "regex":
                    matches = self.regex(rule)
                    result[field] = matches if many else (matches[0] if matches else None)
            except Exception as e:
                result[field] = None
                print(f"[Parser] 字段 '{field}' 提取失败: {e}")
        return result
```

---

### `core/storage.py` — 存储层

```python
import json
import csv
import sqlite3
import os
from pathlib import Path
from typing import Any

class Storage:
    def __init__(self, config):
        self.config = config
        Path(config.output_path).mkdir(parents=True, exist_ok=True)

    def save(self, data: list[dict], filename: str = "data"):
        fmt = self.config.output_format
        if fmt == "json":
            self._save_json(data, filename)
        elif fmt == "csv":
            self._save_csv(data, filename)
        elif fmt == "sqlite":
            self._save_sqlite(data, filename)

    def _save_json(self, data, filename):
        path = f"{self.config.output_path}/{filename}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"[Storage] JSON已保存: {path}（{len(data)}条）")

    def _save_csv(self, data, filename):
        if not data:
            return
        path = f"{self.config.output_path}/{filename}.csv"
        with open(path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        print(f"[Storage] CSV已保存: {path}（{len(data)}条）")

    def _save_sqlite(self, data, filename):
        if not data:
            return
        path = f"{self.config.output_path}/{filename}.db"
        conn = sqlite3.connect(path)
        keys = data[0].keys()
        cols = ", ".join(f'"{k}" TEXT' for k in keys)
        conn.execute(f'CREATE TABLE IF NOT EXISTS "{filename}" ({cols})')
        placeholders = ", ".join("?" for _ in keys)
        conn.executemany(
            f'INSERT INTO "{filename}" VALUES ({placeholders})',
            [tuple(str(row.get(k, "")) for k in keys) for row in data],
        )
        conn.commit()
        conn.close()
        print(f"[Storage] SQLite已保存: {path}（{len(data)}条）")
```

---

### `scraper.py` — 主调度器（组合以上模块）

```python
import asyncio
import time
from typing import Callable, Optional
from config import ScraperConfig
from core.fetcher import Fetcher
from core.parser import Parser
from core.storage import Storage

class Scraper:
    def __init__(self, config: ScraperConfig = None):
        self.config = config or ScraperConfig()
        self.fetcher = Fetcher(self.config)
        self.storage = Storage(self.config)
        self._results: list[dict] = []

    # ── 单页抓取 ──────────────────────────────────────────
    def scrape_one(
        self,
        url: str,
        schema: dict,
        wait_selector: str = None,
    ) -> Optional[dict]:
        html = self.fetcher.fetch(url, wait_selector)
        if not html:
            return None
        parser = Parser(html)
        data = parser.extract(schema)
        data["_url"] = url
        return data

    # ── 批量抓取（同一schema）────────────────────────────
    def scrape_many(
        self,
        urls: list[str],
        schema: dict,
        save_as: str = "data",
    ) -> list[dict]:
        if self.config.use_browser:
            # 浏览器模式：逐个抓取
            results = []
            for i, url in enumerate(urls):
                print(f"[{i+1}/{len(urls)}] {url}")
                item = self.scrape_one(url, schema)
                if item:
                    results.append(item)
                time.sleep(self.config.delay)
        else:
            # 异步高并发模式
            html_list = asyncio.run(self.fetcher.fetch_batch(urls))
            results = []
            for url, html in zip(urls, html_list):
                if html:
                    parser = Parser(html)
                    item = parser.extract(schema)
                    item["_url"] = url
                    results.append(item)

        self._results = results
        self.storage.save(results, save_as)
        return results

    # ── 分页抓取 ──────────────────────────────────────────
    def scrape_paginated(
        self,
        start_url: str,
        schema: dict,
        next_page_selector: str,      # CSS选择器，指向"下一页"链接
        base_url: str = "",
        max_pages: int = 10,
        save_as: str = "data",
    ) -> list[dict]:
        url = start_url
        all_results = []

        for page in range(1, max_pages + 1):
            print(f"[分页] 第{page}页: {url}")
            html = self.fetcher.fetch(url)
            if not html:
                break
            parser = Parser(html)

            # 提取当前页数据
            items = self._extract_list(parser, schema)
            all_results.extend(items)
            print(f"  → 提取 {len(items)} 条，累计 {len(all_results)} 条")

            # 寻找下一页
            next_href = parser.css_one(next_page_selector, attr="href")
            if not next_href:
                print("  → 无下一页，停止")
                break
            url = next_href if next_href.startswith("http") else base_url + next_href
            time.sleep(self.config.delay)

        self.storage.save(all_results, save_as)
        return all_results

    def _extract_list(self, parser: Parser, schema: dict) -> list[dict]:
        """从同一页面提取多条记录（需schema含list字段）"""
        return [parser.extract(schema)]  # 可按需扩展为列表模式
```

---

### 使用示例

```python
from scraper import Scraper
from config import ScraperConfig

# ── 示例1：静态页面批量抓取 ──────────────────────────────
config = ScraperConfig(concurrency=8, output_format="csv")
scraper = Scraper(config)

urls = [
    "https://example.com/product/1",
    "https://example.com/product/2",
]
schema = {
    "title":  {"type": "css",   "rule": "h1.product-title"},
    "price":  {"type": "css",   "rule": "span.price"},
    "stock":  {"type": "xpath", "rule": "//div[@class='stock']/text()"},
    "images": {"type": "css",   "rule": "img.gallery", "attr": "src", "many": True},
}
results = scraper.scrape_many(urls, schema, save_as="products")

# ── 示例2：JS渲染页面 ────────────────────────────────────
config2 = ScraperConfig(use_browser=True, delay=2.0)
scraper2 = Scraper(config2)
item = scraper2.scrape_one(
    "https://spa-site.com/item/123",
    schema,
    wait_selector=".product-title",  # 等待该元素出现再解析
)

# ── 示例3：分页抓取 ──────────────────────────────────────
scraper.scrape_paginated(
    start_url="https://example.com/list?page=1",
    schema=schema,
    next_page_selector="a.next-page",
    base_url="https://example.com",
    max_pages=20,
    save_as="all_products",
)
```

---

## 方案选型建议

| 场景 | 推荐方案 |
|------|---------|
| 静态HTML，量少 | `requests` + `BeautifulSoup` |
| 静态HTML，高并发 | `aiohttp` + `lxml` |
| JS渲染单页应用 | `Playwright`（首选）|
| 工业级大规模 | `Scrapy` 框架 |
| 自动提取正文 | `trafilatura` |
| 反爬严重 | 代理池 + 随机UA + 浏览器指纹 |

反爬对抗（进阶）可叠加：`fake-useragent`（随机UA）、`playwright-stealth`（隐藏自动化特征）、`redis`（分布式去重队列）。
