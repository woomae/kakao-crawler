import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
import SELECTORS from './tags';
import read_kakao_reviews from './readkakaoReviews';
import getLikePoint from './getLikePoint';

export default async function kakaoScrape(url: string): Promise<void> {
    const startTime = performance.now();

    // 브라우저 인스턴스 실행
    const browser = await puppeteer.launch({ headless: 'new' });

    // 새 페이지 열기
    const page = await browser.newPage();

    // 페이지 크기 설정
    await page.setViewport({
        width: 1920,
        height: 1080,
    });
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36'
    );

    // 네트워크 요청 가로채기 활성화
    await page.setRequestInterception(true);

    // 네트워크 요청을 가로채서 이미지 요청 차단
    page.on('request', (request) => {
        if (request.resourceType() === 'image') {
            request.abort();
        } else {
            request.continue();
        }
    });

    // 페이지 이동 {로딩 완료까지 대기}
    await page.goto(url, { waitUntil: 'networkidle0' });

    //추가 대기시간 설정
    const additionalWaitTime = 3000; // 추가 대기시간 (3초)

    //like point 로직
    await page.waitForSelector(SELECTORS.likePoint, {
        timeout: additionalWaitTime,
    });
    const likePointContent = await page.content();
    const likePointResult = getLikePoint(likePointContent);
    console.log(likePointResult);

    //페이지 스프레드 로직
    let loadMoreVisible = true;
    while (loadMoreVisible) {
        try {
            // "더보기" 버튼이 로드될 때까지 대기
            await page.waitForSelector(SELECTORS.loadMoreButton, {
                timeout: additionalWaitTime,
            });
            const loadMoreButton = await page.$(SELECTORS.loadMoreButton);
            await loadMoreButton?.click();
            await loadMoreButton?.dispose();
            await page.waitForNetworkIdle({ idleTime: 2, timeout: 2000 });
        } catch (error) {
            loadMoreVisible = false;
            console.log(error);
        }
    }
    const content = await page.content();
    const reviewTexts = read_kakao_reviews(content);

    const endTime = performance.now();
    console.log(reviewTexts);
    console.log(reviewTexts.length);
    console.log(`크롤링 소요 시간: ${(endTime - startTime).toFixed(3)}ms`);
    await browser.close();
}
