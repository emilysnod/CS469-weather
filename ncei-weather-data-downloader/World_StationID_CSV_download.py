import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://www.ncei.noaa.gov/data/global-hourly/access/"

def get_links(url):
    """Get all subdirectory or file links from an index page."""
    resp = requests.get(url)
    soup = BeautifulSoup(resp.text, "html.parser")
    links = [urljoin(url, a['href']) for a in soup.find_all('a', href=True)]
    return [link for link in links if not link.endswith('?C=M;O=D') and not link.endswith('/../')]

def crawl_and_download(base_url):
    years = [link for link in get_links(base_url) if link.rstrip('/').split('/')[-1].isdigit()]
    for year_url in years:
        # print(f"Scanning year: {year_url}")
        # stations = get_links(year_url)
        # for station_url in stations:
            # print(f"  Scanning station: {station_url}")
        files = get_links(year_url)
        for file_url in files:
            if file_url.endswith('.csv'):
                filename = file_url.split('/')[-1]
                year = year_url.rstrip('/').split('/')[-1]
                # station = year_url.rstrip('/').split('/')[-1]
                outdir = os.path.join("downloads", year)
                os.makedirs(outdir, exist_ok=True)
                filepath = os.path.join(outdir, filename)
                if not os.path.exists(filepath):
                    print(f"    Downloading: {file_url}")
                    with open(filepath, 'wb') as f:
                        f.write(requests.get(file_url).content)

crawl_and_download(BASE_URL)
