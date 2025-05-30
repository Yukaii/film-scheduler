import { Category, FestivalConfig } from './types';

export class Config {
  static readonly API_URL = 'https://www.taipeiff.taipei/api/articles/movies';
  static readonly FILM_LIST_URL = 'https://www.taipeiff.taipei/tw/movies/list';
  
  static readonly CATEGORIES: Category[] = [
    { value: '178', label: '2025台北電影節' },
  ];

  static readonly FESTIVALS: FestivalConfig[] = [
    { year: '2025', category: '178' },
  ];

  // Common headers for API requests
  static readonly HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-TW,zh;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': 'https://www.taipeiff.taipei',
    'Pragma': 'no-cache',
    'Referer': 'https://www.taipeiff.taipei/tw/movies?c=178',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Microsoft Edge";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"'
  };

  // Mock encrypted token - in real implementation this would need to be dynamically generated
  static readonly MOCK_TOKEN = 'ec751f14d7915a3372ae3dbb4a6a5dcaa7f431af3f5772a81abbbb4bd70345d76f1001454ec614d251d0fb6c3be8b90cafef6523ad73531b2fa2a6cbf5c3f77cd984697851fa490377524ff62ae06006';
  static readonly TOKEN_KEY = '5648e5284e20a699eec058285a8b43b0';
}